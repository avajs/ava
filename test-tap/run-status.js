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
