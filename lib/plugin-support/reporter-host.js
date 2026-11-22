import {randomUUID} from 'node:crypto';
import {addAbortListener} from 'node:events';
import process from 'node:process';
import {finished} from 'node:stream/promises';
import {BroadcastChannel, Worker} from 'node:worker_threads';

import pkg from '../pkg.js';

const levelsByProtocol = Object.assign(Object.create(null), {experimental: 1});
const loader = new URL('reporter-loader.js', import.meta.url);

class FlushTimeoutError extends Error {
	name = 'FlushTimeoutError';
}

function deferred() {
	const promise = Promise.withResolvers();
	promise.promise.catch(() => {});
	return promise;
}

async function withSignal(promise, signal) {
	if (!signal) {
		return promise;
	}

	let subscription;
	try {
		return await Promise.race([
			promise,
			new Promise((_, reject) => {
				if (signal.aborted) {
					reject(signal.reason);
				} else {
					subscription = addAbortListener(signal, () => reject(signal.reason));
				}
			}),
		]);
	} finally {
		subscription?.[Symbol.dispose]();
	}
}

async function drainWorker(state) {
	await state.exited.promise;
	await Promise.all([state.worker.stdout, state.worker.stderr].map(stream => finished(stream, {cleanup: true})));
}

function validateNegotiation(plugin, message, reservedFlags, usedFlags) {
	if (typeof message.version !== 'string' || !Array.isArray(message.supported) || message.supported.some(identifier => typeof identifier !== 'string')) {
		throw new Error(`Invalid negotiation from plugin ${plugin.namespace}`);
	}

	const identifier = message.supported.find(identifier => Object.hasOwn(levelsByProtocol, identifier));
	if (!identifier) {
		throw new Error(`This version of AVA (${pkg.version}) is not compatible with ${plugin.namespace}@${message.version}`);
	}

	if (message.namespace !== plugin.namespace || !/^[a-z][0-9a-z]*$/.test(message.namespace)) {
		throw new Error(`Invalid namespace for plugin ${plugin.namespace}`);
	}

	if (!Array.isArray(message.capabilities) || message.capabilities.some(capability => capability !== 'reporter')) {
		throw new Error(`Invalid capabilities for plugin ${plugin.namespace}`);
	}

	validateFlags(message, reservedFlags, usedFlags);
	return identifier;
}

function validateFlags(message, reservedFlags, usedFlags) {
	if (!message.flags || typeof message.flags !== 'object' || Array.isArray(message.flags)) {
		throw new Error(`Invalid flags for plugin ${message.namespace}`);
	}

	for (const [name, definition] of Object.entries(message.flags)) {
		if (!definition
			|| (name !== message.namespace && !name.startsWith(`${message.namespace}-`))
			|| reservedFlags.has(name) || usedFlags.has(name)
			|| !['boolean', 'string', 'number'].includes(definition.type)
			|| typeof definition.description !== 'string'
			|| Object.keys(definition).some(key => key !== 'type' && key !== 'description')) {
			throw new Error(`Invalid or conflicting flag --${name} in plugin ${message.namespace}`);
		}

		usedFlags.add(name);
	}
}

export default class ReporterHost {
	#colorLevel;
	#flushTimeout;
	#interruptTimeout;
	#projectDir;
	#reservedFlags;
	#startupTimeout;
	#stderr;
	#stdout;
	#channel;
	#channelName = randomUUID();
	#claimsStdout = false;
	#diagnostics = [];
	#failure = deferred();
	#flushTimedOut = false;
	#pluginError;
	#plugins;
	#seq = 0;
	#stopping = false;

	constructor({
		colorLevel, flushTimeout = 10_000, interruptTimeout = 2000, projectDir, reservedFlags = [],
		startupTimeout = 10_000, stderr = process.stderr, stdout = process.stdout,
		plugins, debug = false,
	}) {
		this.#colorLevel = colorLevel;
		this.#flushTimeout = debug ? 0 : flushTimeout;
		this.#interruptTimeout = debug ? 0 : interruptTimeout;
		this.#projectDir = projectDir;
		this.#reservedFlags = new Set(reservedFlags);
		this.#startupTimeout = debug ? 0 : startupTimeout;
		this.#stderr = stderr;
		this.#stdout = stdout;

		this.#channel = new BroadcastChannel(this.#channelName);
		this.#plugins = plugins.map(plugin => this.#launch(plugin));
	}

	#launch(plugin) {
		const worker = new Worker(loader, {
			env: {...process.env, FORCE_COLOR: String(this.#colorLevel)},
			execArgv: ['--unhandled-rejections=strict'],
			stdout: true,
			stderr: true,
			workerData: {channelName: this.#channelName, filename: plugin.filename.toString()},
		});
		const state = {
			...plugin, worker, negotiation: deferred(), configured: deferred(), ready: deferred(), exited: deferred(), acks: new Map(),
			startupSignal: this.#startupTimeout ? AbortSignal.timeout(this.#startupTimeout) : undefined,
		};
		worker.stdout.pipe(this.#stdout, {end: false});
		worker.stderr.pipe(this.#stderr, {end: false});
		const fail = error => {
			if (state.failed || state.stopped || this.#stopping) {
				return;
			}

			state.failed = new Error(`Plugin ${state.namespace}: ${error.message}`, {cause: error});
			state.startupSubscription?.[Symbol.dispose]();
			for (const pending of [state.negotiation, state.configured, state.ready]) {
				pending.reject(state.failed);
			}

			for (const pending of state.acks.values()) {
				pending.reject(state.failed);
			}

			this.#pluginError ??= state.failed;
			this.#failure.reject(state.failed);
		};

		worker.on('error', fail);
		worker.on('exit', code => {
			state.exitCode = code;
			state.exited.resolve();
			// Worker messages are delivered before its exit event.
			if (!state.finished && !state.stopped && !state.inactive) {
				fail(new Error(`thread exited unexpectedly (code ${code})`));
			}
		});
		worker.on('message', message => { // eslint-disable-line complexity
			if (state.stopped || state.failed) {
				return;
			}

			if (!message || typeof message !== 'object') {
				fail(new Error('invalid control message'));
				return;
			}

			switch (message.type) {
				case 'negotiate': {
					if (state.description) {
						fail(new Error('duplicate negotiation'));
						break;
					}

					state.description = message;
					state.negotiation.resolve(message);
					break;
				}

				case 'configured': {
					if (state.configurationId === undefined || message.id !== state.configurationId || state.configurationReceived) {
						fail(new Error('unexpected configuration reply'));
						break;
					}

					state.configurationReceived = true;
					state.configured.resolve(message.result);
					break;
				}

				case 'ready': {
					if (!state.activated || state.isReady) {
						fail(new Error('unexpected ready message'));
						break;
					}

					state.isReady = true;
					state.startupSubscription?.[Symbol.dispose]();
					state.ready.resolve();
					break;
				}

				case 'ack': {
					if (!state.acks.has(message.seq)) {
						fail(new Error(`unexpected acknowledgement ${message.seq}`));
						break;
					}

					if (message.seq === state.finalSeq) {
						state.finished = true;
					}

					state.acks.get(message.seq).resolve();
					state.acks.delete(message.seq);
					break;
				}

				case 'error': {
					fail(new Error(message.error?.message ?? 'unknown plugin error'));
					break;
				}

				default: {
					fail(new Error(`unexpected control message ${message.type}`));
				}
			}
		});
		if (state.startupSignal) {
			state.startupSubscription = addAbortListener(state.startupSignal, () => fail(new Error('startup timed out')));
		}

		return state;
	}

	#rejectStartup(error) {
		for (const state of this.#plugins) {
			if (state.stopped || state.failed) {
				continue;
			}

			state.rejectRequested = true;
			state.worker.postMessage({type: 'reject', error});
		}
	}

	async #synchronize(message, signal) {
		const seq = this.#seq;
		const active = this.#plugins.filter(state => state.result?.active && !state.failed && !state.stopped);
		const waits = active.map(state => {
			const ack = deferred();
			state.acks.set(seq, ack);
			if (message.type === 'end-of-stream') {
				state.finalSeq = seq;
			}

			return ack.promise;
		});
		this.publish({...message, sync: true});
		try {
			const completed = Promise.all(waits).then(async () => {
				if (message.type === 'end-of-stream') {
					await Promise.all(active.map(state => drainWorker(state)));
				}

				await Promise.all([this.#stdout, this.#stderr].map(stream => new Promise((resolve, reject) => {
					stream.write('', error => {
						if (error) {
							reject(error);
						} else {
							resolve();
						}
					});
				})));
			});
			await withSignal(completed, signal);
		} catch (error) {
			if (signal?.aborted && error === signal.reason) {
				throw new FlushTimeoutError('Plugin output flush timed out', {cause: error});
			}

			throw error;
		}
	}

	get active() {
		return this.#plugins.some(state => state.result?.active);
	}

	get claimsStdout() {
		return this.#claimsStdout;
	}

	get diagnostics() {
		return this.#diagnostics.map(diagnostic => ({...diagnostic}));
	}

	get flushTimedOut() {
		return this.#flushTimedOut;
	}

	get failure() {
		return this.#failure.promise;
	}

	async negotiate() {
		try {
			const usedFlags = new Set();
			const namespaces = new Set();
			await Promise.all(this.#plugins.map(async state => {
				const message = await state.negotiation.promise;
				if (namespaces.has(state.namespace)) {
					throw new Error(`Duplicate plugin namespace ${state.namespace}`);
				}

				namespaces.add(state.namespace);
				state.identifier = validateNegotiation(state, message, this.#reservedFlags, usedFlags);
			}));
			return Object.assign({}, ...this.#plugins.map(state => state.description.flags));
		} catch (error) {
			this.#rejectStartup(error);
			throw error;
		}
	}

	async configure({flags, mode}) {
		try {
			const diagnostics = this.#diagnostics;
			await Promise.all(this.#plugins.map(async (state, id) => {
				state.configurationId = id;
				state.worker.postMessage({
					type: 'configure',
					id,
					context: {
						ava: {version: pkg.version},
						identifier: state.identifier,
						projectDir: this.#projectDir,
						terminal: {stdout: {colorLevel: this.#colorLevel}},
						options: state.options,
						flags: Object.fromEntries(Object.keys(state.description.flags).map(name => [name, flags[name]])),
						mode,
					},
				});
				const result = await state.configured.promise;
				if (!result || typeof result.active !== 'boolean'
					|| (result.claims !== undefined && (!Array.isArray(result.claims)
						|| !state.description.capabilities.includes('reporter') || result.claims.some(claim => claim !== 'stdout')))
					|| (result.diagnostics !== undefined && (!Array.isArray(result.diagnostics)
						|| result.diagnostics.some(diagnostic => !diagnostic || !['warning', 'error'].includes(diagnostic.level) || typeof diagnostic.message !== 'string')))) {
					throw new Error(`Invalid configuration result from plugin ${state.namespace}`);
				}

				state.result = result;
				diagnostics.push(...result.diagnostics ?? []);
				if (result.active) {
					return;
				}

				state.inactive = true;
				await Promise.race([drainWorker(state), state.ready.promise]);
				state.startupSubscription?.[Symbol.dispose]();
				state.stopped = true;
			}));
			const errors = diagnostics.filter(diagnostic => diagnostic.level === 'error');
			if (errors.length > 0) {
				throw new Error(errors.map(diagnostic => diagnostic.message).join('\n'));
			}

			const claimants = this.#plugins.filter(state => state.result.active && state.result.claims?.includes('stdout'));
			if (claimants.length > 1) {
				throw new Error(`Multiple plugins claim stdout: ${claimants.map(state => state.namespace).join(', ')}`);
			}

			this.#claimsStdout = claimants.length === 1;
			for (const state of this.#plugins) {
				if (!state.result.active) {
					continue;
				}

				state.activated = true;
				state.worker.postMessage({type: 'activate'});
			}

			await Promise.all(this.#plugins.filter(state => state.result.active).map(state => state.ready.promise));
			return this.diagnostics;
		} catch (error) {
			this.#rejectStartup(error);
			throw error;
		}
	}

	publish(message) {
		const seq = this.#seq++;
		this.#channel.postMessage({...message, seq});
		return seq;
	}

	async finish(message, {interrupted = false} = {}) {
		const timeout = interrupted ? this.#interruptTimeout : this.#flushTimeout;
		const signal = timeout ? AbortSignal.timeout(timeout) : null;
		try {
			await this.#synchronize(message, signal);
			await this.#synchronize({type: 'end-of-stream'}, signal);
			if (this.#pluginError) {
				throw this.#pluginError;
			}
		} catch (error) {
			const isTimeout = error instanceof FlushTimeoutError;
			if (isTimeout) {
				this.#flushTimedOut = true;
				this.#stderr.write(`${error.message}\n`);
			}

			if (this.#pluginError) {
				throw this.#pluginError;
			}

			if (!isTimeout) {
				throw error;
			}
		} finally {
			await this.close();
		}
	}

	async close() {
		this.#stopping = true;
		this.#channel.close();
		await Promise.all(this.#plugins.map(async state => {
			state.startupSubscription?.[Symbol.dispose]();
			state.stopped = true;
			if (state.rejectRequested && state.exitCode === undefined) {
				try {
					await withSignal(drainWorker(state), state.startupSignal);
				} catch (error) {
					if (!state.startupSignal?.aborted || error !== state.startupSignal.reason) {
						throw error;
					}
				}
			}

			state.worker.postMessage({type: 'terminate'});
			await state.worker.terminate();
		}));
	}
}
