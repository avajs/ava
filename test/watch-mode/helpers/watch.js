import fs from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';

import ava from '@ava/test';
import {temporaryDirectoryTask} from 'tempy';

import {available} from '../../../lib/watcher.js';
import {resolveFixtureDirectory, exec} from '../../helpers/exec.js';

export const test = available(fileURLToPath(import.meta.url)) ? ava : ava.skip;
export const serial = available(fileURLToPath(import.meta.url)) ? ava.serial : ava.serial.skip;

/**
 Races between `promises` and returns the result, unless `possiblyErroring` rejects first.

 @param {unknown} possiblyErroring Any value that may reject.
 @param {...Promise<unknown>} promises Promises to race against `possiblyErroring`.
 */
const raceUnlessError = async (possiblyErroring, ...promises) => {
	const race = Promise.race(promises);
	const intermediate = await Promise.race([didNotError(possiblyErroring), race]);
	return intermediate === didNotError ? race : intermediate;
};

const didNotError = async possiblyErroring => {
	await possiblyErroring;
	return didNotError;
};

export const withFixture = fixture => async (t, task) => {
	let isCompletedTask = false;
	try {
		await temporaryDirectoryTask(async dir => {
			await fs.cp(resolveFixtureDirectory(fixture), dir, {recursive: true, filter: src => !src.includes('/node_modules/')});

			async function * run(args = [], options = {}) {
				yield * exec(['--watch', ...args], {...options, cwd: dir, env: {AVA_FORCE_CI: 'not-ci', ...options.env}});
			}

			async function mkdir(file, options = {}) {
				await fs.mkdir(path.join(dir, file), options);
			}

			async function read(file) {
				return fs.readFile(path.join(dir, file), 'utf8');
			}

			async function rm(file, options = {}) {
				await fs.rm(path.join(dir, file), options);
			}

			async function stat(file) {
				return fs.stat(path.join(dir, file));
			}

			async function touch(file) {
				const time = new Date();
				await fs.utimes(path.join(dir, file), time, time);
			}

			async function write(file, contents = '') {
				await fs.writeFile(path.join(dir, file), contents);
			}

			const operations = {
				mkdir,
				read,
				rm,
				stat,
				touch,
				write,
			};

			let activeWatchCount = 0;
			await task(t, {
				...operations,
				dir,
				run,
				async watch(handlers, args = [], options = {}) {
					activeWatchCount++;

					const {promise: donePromise, resolve: signalDone} = Promise.withResolvers();
					let isDone = false;
					const done = () => {
						activeWatchCount--;
						isDone = true;
						signalDone({done: true});
					};

					let idlePromise = new Promise(() => {});
					let isAssertingIdle = false;
					let isFailedIdleAssertion = false;
					const assertIdle = async next => {
						isAssertingIdle = true;

						t.timeout(30_000);

						const promise = Promise.all([delay(5000, null, {ref: false}), next?.()]).finally(() => {
							if (idlePromise !== promise) {
								return;
							}

							idlePromise = new Promise(() => {});
							isAssertingIdle = false;
							t.timeout.clear();
							if (!isFailedIdleAssertion) {
								return;
							}

							isFailedIdleAssertion = false;
							t.fail('Watcher performed a test run while it should have been idle');
						}).then(() => ({}));
						idlePromise = promise;

						await promise;
					};

					let state = {};
					let pendingState;
					let process;

					t.teardown(async () => {
						if (process?.nodeChildProcess.connected) {
							process.nodeChildProcess.send('abort-watcher');
						}

						// Sending the `abort-watcher` message should suffice, but on Linux
						// the recursive watch handle does not close properly. See
						// <https://github.com/nodejs/node/issues/48437> but there seem to be
						// other issues.
						setTimeout(() => {
							process?.nodeChildProcess.kill('SIGKILL');
						}, 1000).unref();

						try {
							await process;
						} catch {}
					});

					const results = run(args, options);
					try {
						let nextResult = results.next();
						while (!isDone) { // eslint-disable-line no-unmodified-loop-condition
							const item = await raceUnlessError(pendingState, nextResult, idlePromise, donePromise); // eslint-disable-line no-await-in-loop
							process ??= item.value?.process;

							if (item.value) {
								isFailedIdleAssertion ||= isAssertingIdle;

								state = (await pendingState) ?? state; // eslint-disable-line no-await-in-loop
								const result = item.value;
								const {[result.runCount]: handler = handlers.else} = handlers; // eslint-disable-line unicorn/no-unreadable-object-destructuring
								pendingState = handler?.call({assertIdle, done, ...operations}, result, state);

								if (!isDone && !item.done) {
									nextResult = results.next();
								}
							}

							if (item.done) {
								await pendingState; // eslint-disable-line no-await-in-loop
								break;
							}
						}
					} finally {
						results.return();

						// Handle outstanding promises in case they reject.
						if (isAssertingIdle) {
							await idlePromise;
						}

						await pendingState;
					}
				},
			});

			t.is(activeWatchCount, 0, 'Handlers for all watch() calls should have invoked `this.done()` to end their tests');
			isCompletedTask = true;
		});
	} catch (error) {
		if (!isCompletedTask) {
			throw error;
		}

		switch (error.code) { // https://github.com/sindresorhus/tempy/issues/47
			case 'EBUSY':
			case 'EMFILE':
			case 'ENFILE':
			case 'ENOTEMPTY':
			case 'EPERM ': {
				return;
			}

			default: {
				throw error;
			}
		}
	}
};
