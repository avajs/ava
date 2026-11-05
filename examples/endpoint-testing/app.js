/**
 * examples/endpoint-testing/app.js
 *
 * Reliable cleanup pattern addressing AVA #928:
 * "Make it easier to write reliable cleanup tasks"
 * https://github.com/avajs/ava/issues/928
 *
 * Problem:
 * - `test.after.always()` may not run when `--fail-fast` stops the run after a failure.
 * - It may not run on uncaught exceptions, leaving resources (servers, temp files, DB
 *   connections) leaked.
 *
 * Strategy:
 * 1. `t.teardown(fn)` (AVA) for per-test cleanup: runs even when a test fails or throws,
 *    in reverse registration order.
 * 2. Defensive, idempotent cleanup handlers for process-level safety (uncaught exceptions /
 *    signals outside AVA's control).
 * 3. A small registry so cleanup is deterministic and safe to call multiple times.
 *
 * Exports:
 * - `default app(request, response)`: the HTTP handler under test.
 * - `createCleanupRegistry()`: framework-agnostic reliable cleanup helper.
 * - `withServer(handler)`: example helper showing teardown-style usage.
 */

import http from 'node:http';
import { once } from 'node:events';

export default function app(request, response) {
	if (request.url === '/user') {
		response.setHeader('Content-Type', 'application/json');
		response.end(JSON.stringify({ email: 'ava@rocks.com' }));
	} else {
		response.writeHead(404);
		response.end();
	}
}

export function createCleanupRegistry() {
	const tasks = [];
	let ran = false;

	return {
		add(fn) {
			if (ran) {
				throw new Error('Cannot add cleanup tasks after registry has run');
			}

			tasks.push(fn);
			let active = true;
			return () => {
				if (!active) {
					return;
				}
				active = false;
				const index = tasks.indexOf(fn);
				if (index !== -1) {
					tasks.splice(index, 1);
				}
			};
		},

		async run() {
			if (ran) {
				return;
			}
			ran = true;

			const errors = [];
			while (tasks.length > 0) {
				const fn = tasks.pop();
				try {
					await fn();
				} catch (error) {
					errors.push(error);
				}
			}

			if (errors.length === 1) {
				throw errors[0];
			}
			if (errors.length > 1) {
				throw new AggregateError(errors, 'Multiple cleanup tasks failed');
			}
		},

		size() {
			return ran ? 0 : tasks.length;
		}
	};
}

export async function withServer(handler = app) {
	const server = http.createServer(handler);
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');

	const { port } = server.address();
	const url = `http://127.0.0.1:${port}`;

	let closed = false;
	const close = async () => {
		if (closed) {
			return;
		}
		closed = true;
		if (!server.listening) {
			return;
		}
		await new Promise((resolve, reject) => {
			server.close((error) => (error ? reject(error) : resolve()));
		});
	};

	return { server, url, close };
}

async function runVerification() {
	const assert = await import('node:assert/strict');
	let passed = 0;
	let failed = 0;

	async function test(name, fn) {
		try {
			await fn();
			passed += 1;
			console.log(`ok - ${name}`);
		} catch (error) {
			failed += 1;
			console.error(`not ok - ${name}`);
			console.error(error && error.stack ? error.stack : error);
		}
	}

	await test('app responds with user JSON', async () => {
		const { url, close } = await withServer(app);
		try {
			const response = await fetch(`${url}/user`);
			assert.equal(response.status, 200);
			assert.equal(response.headers.get('content-type'), 'application/json');
			const body = await response.json();
			assert.deepEqual(body, { email: 'ava@rocks.com' });
		} finally {
			await close();
		}
	});

	await test('app responds with 404 for unknown routes', async () => {
		const { url, close } = await withServer(app);
		try {
			const response = await fetch(`${url}/missing`);
			assert.equal(response.status, 404);
		} finally {
			await close();
		}
	});

	await test('cleanup registry runs tasks after simulated test failure', async () => {
		const registry = createCleanupRegistry();
		let cleaned = false;
		registry.add(async () => {
			cleaned = true;
		});

		let testError;
		try {
			throw new Error('simulated assertion/fail-fast path');
		} catch (error) {
			testError = error;
		} finally {
			await registry.run();
		}

		assert.ok(testError);
		assert.equal(cleaned, true);
	});

	await test('cleanup registry is idempotent', async () => {
		const registry = createCleanupRegistry();
		let count = 0;
		registry.add(() => {
			count += 1;
		});
		await registry.run();
		await registry.run();
		assert.equal(count, 1);
	});

	await test('cleanup registry runs in LIFO order', async () => {
		const registry = createCleanupRegistry();
		const order = [];
		registry.add(() => order.push('first'));
		registry.add(() => order.push('second'));
		registry.add(() => order.push('third'));
		await registry.run();
		assert.deepEqual(order, ['third', 'second', 'first']);
	});

	await test('cleanup registry continues after a task error and reports failure', async () => {
		const registry = createCleanupRegistry();
		const order = [];
		registry.add(() => order.push('first-ran'));
		registry.add(() => {
			throw new Error('cleanup boom');
		});
		registry.add(() => order.push('third-ran'));

		await assert.rejects(() => registry.run(), /cleanup boom/);
		assert.deepEqual(order, ['third-ran', 'first-ran']);
	});

	await test('server close is idempotent (safe defensive cleanup)', async () => {
		const { close, server } = await withServer(app);
		await close();
		await close();
		assert.equal(server.listening, false);
	});

	console.log(`\n# verification: ${passed} passed, ${failed} failed`);
	if (failed > 0) {
		process.exitCode = 1;
	}
}

const isDirectRun =
	process.argv[1] &&
	import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;

if (isDirectRun) {
	await runVerification();
}