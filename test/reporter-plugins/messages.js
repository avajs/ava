import path from 'node:path';
import process from 'node:process';

import test from '@ava/test';

import {runEnd, runEvent, runPlan} from '../../lib/plugin-support/run-messages.js';

test('run plans share title-shortening rules, without prefixing a single file', t => {
	const base = process.cwd() + path.sep;
	const file = path.join(base, 'nested', '__tests__', 'test-example.test.js');
	t.deepEqual(runPlan({files: [file]}, ['js']), {titlePrefixes: new Map()});
	t.deepEqual(runPlan({files: [file, 'other'], filePathPrefix: base}, ['js']).titlePrefixes.get(file), ['nested', 'example']);
});

test('adapter excludes internal messages and selects only protocol fields', t => {
	t.is(runEvent({type: 'stats', stats: {}}, {}), undefined);
	t.is(runEvent({type: 'end'}, {}), undefined);
	const pendingTests = new Map([['file', new Set(['test'])]]);
	const event = runEvent({
		type: 'timeout', period: 10, pendingTests, pendingTestsLogs: new Map(),
	}, {});
	t.deepEqual(structuredClone(event), {type: 'timeout', period: 10, pendingTests});
	const chunk = new Uint8Array([0, 255, 65]);
	t.deepEqual(structuredClone(runEvent({
		type: 'worker-stdout', testFile: 'file', chunk, internal: true,
	}, {})), {type: 'worker-stdout', testFile: 'file', chunk});
});

test('worker-finished carries current per-file counts without changing internal events', t => {
	const event = {type: 'worker-finished', testFile: 'file', forcedExit: false};
	const plan = {failFastEnabled: true, status: {stats: {byFile: new Map([['file', {declaredTests: 3, remainingTests: 2}]])}}};
	t.deepEqual(runEvent(event, plan), {
		...event, declaredTests: 3, remainingTests: 2, failFast: true,
	});
	t.deepEqual(event, {type: 'worker-finished', testFile: 'file', forcedExit: false});
});

test('hook failure phases are optional and preserved without changing titles or event types', t => {
	for (const failurePhase of [undefined, 'post-test', 'post-test-file']) {
		const event = {
			type: 'hook-failed', title: 'custom hook', testFile: 'file', err: {}, duration: 1, logs: [],
			...(failurePhase && {failurePhase}),
		};
		t.deepEqual(runEvent({...event, internal: true}, {}), event);
	}
});

test('run-end includes totals and exit information without per-file stats', t => {
	const totals = {
		files: 2, failedTests: 1, remainingTests: 0, passedTests: 2, passedKnownFailingTests: 1, skippedTests: 1, todoTests: 1,
		parallelRuns: {currentFileCount: 1, currentIndex: 0, totalRuns: 2},
	};
	t.deepEqual(runEnd({status: {stats: {...totals, byFile: new Map(), internalErrors: 0}}}, 2, 'interrupted', 1), {
		type: 'run-end', runId: 2, reason: 'interrupted', suggestedExitCode: 1, totals,
	});
	t.is(runEnd({status: {stats: {...totals, parallelRuns: null}}}, 1, 'completed', 0).totals.parallelRuns, undefined);
});
