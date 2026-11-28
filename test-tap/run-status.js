import {setTimeout as delay} from 'node:timers/promises';

import {test} from 'tap';

import RunStatus from '../lib/run-status.js';

const collectStats = runStatus => {
	const snapshots = [];
	runStatus.on('stateChange', ({data: event}) => {
		if (event.type === 'stats') {
			snapshots.push(event.stats);
		}
	});
	return snapshots;
};

test('each emitted stats snapshot is an independent copy', async t => {
	const runStatus = new RunStatus(1, null, {});
	runStatus.observeWorker({onStateChange() {}}, 'test.js', {});

	const snapshots = collectStats(runStatus);

	runStatus.emitStateChange({type: 'declared-test', testFile: 'test.js'});
	runStatus.emitStateChange({type: 'declared-test', testFile: 'test.js'});
	await delay(10);

	t.equal(snapshots.length, 2);

	// The first snapshot must not be mutated by the second state change. This guards the
	// purpose-built copy in run-status.js against regressing to a shallow copy.
	t.equal(snapshots[0].declaredTests, 1);
	t.equal(snapshots[1].declaredTests, 2);
	t.equal(snapshots[0].byFile.get('test.js').declaredTests, 1);
	t.equal(snapshots[1].byFile.get('test.js').declaredTests, 2);
	t.not(snapshots[0].byFile, snapshots[1].byFile);
	t.not(snapshots[0].byFile.get('test.js'), snapshots[1].byFile.get('test.js'));
});

test('parallelRuns is copied, not shared', async t => {
	const runStatus = new RunStatus(1, {currentFileCount: 1, currentIndex: 0, totalRuns: 2}, {});
	runStatus.observeWorker({onStateChange() {}}, 'test.js', {});

	const snapshots = collectStats(runStatus);

	runStatus.emitStateChange({type: 'declared-test', testFile: 'test.js'});
	await delay(10);

	t.same(snapshots[0].parallelRuns, {currentFileCount: 1, currentIndex: 0, totalRuns: 2});
	t.not(snapshots[0].parallelRuns, runStatus.stats.parallelRuns);
});

test('timeout only includes started tests and hooks', async t => {
	const runStatus = new RunStatus(1, null, {});
	runStatus.observeWorker({onStateChange() {}}, 'test.js', {});

	const events = [];
	runStatus.on('stateChange', ({data: event}) => {
		events.push(event);
	});

	runStatus.emitStateChange({
		type: 'selected-test',
		title: 'started serial',
		skip: false,
		todo: false,
		testFile: 'test.js',
	});
	runStatus.emitStateChange({
		type: 'selected-test',
		title: 'unstarted serial',
		skip: false,
		todo: false,
		testFile: 'test.js',
	});
	runStatus.emitStateChange({
		type: 'hook-started',
		title: 'completed before hook',
		logs: [],
		testFile: 'test.js',
	});
	runStatus.emitStateChange({type: 'hook-ended', title: 'completed before hook', testFile: 'test.js'});
	runStatus.emitStateChange({
		type: 'hook-started',
		title: 'stalled beforeEach hook',
		logs: ['hook log'],
		testFile: 'test.js',
	});
	runStatus.emitStateChange({
		type: 'test-register-log-reference',
		title: 'started serial',
		logs: ['test log'],
		testFile: 'test.js',
	});
	runStatus.emitStateChange({type: 'timeout', period: 500});
	await delay(10);

	const timeoutEvent = events.find(event => event.type === 'timeout');
	t.same([...timeoutEvent.pendingTests.get('test.js')], ['started serial']);
	t.same(timeoutEvent.pendingTestsLogs.get('test.js').get('started serial'), ['test log']);
	t.same([...timeoutEvent.pendingHooks.get('test.js')], ['stalled beforeEach hook']);
	t.same(timeoutEvent.pendingHooksLogs.get('test.js').get('stalled beforeEach hook'), ['hook log']);
	t.equal(runStatus.stats.timedOutTests, 1);
	t.equal(runStatus.stats.timedOutHooks, 1);
	t.equal(runStatus.stats.remainingTests, 2);
});

test('worker-failed clears pending maps for crashed workers', async t => {
	const runStatus = new RunStatus(2, null, {});
	runStatus.observeWorker({onStateChange() {}}, 'crashed.js', {});
	runStatus.observeWorker({onStateChange() {}}, 'stalled.js', {});

	const events = [];
	runStatus.on('stateChange', ({data: event}) => {
		events.push(event);
	});

	runStatus.emitStateChange({type: 'worker-failed', nonZeroExitCode: 1, testFile: 'crashed.js'});
	runStatus.emitStateChange({
		type: 'test-register-log-reference',
		title: 'slow',
		logs: [],
		testFile: 'stalled.js',
	});
	runStatus.emitStateChange({type: 'timeout', period: 500});
	await delay(10);

	const timeoutEvent = events.find(event => event.type === 'timeout');
	t.equal(timeoutEvent.pendingTests.has('crashed.js'), false);
	t.equal(timeoutEvent.pendingHooks.has('crashed.js'), false);
	t.same([...timeoutEvent.pendingTests.get('stalled.js')], ['slow']);
});
