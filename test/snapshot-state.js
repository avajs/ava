'use strict';
const path = require('path');
const test = require('tap').test;
const sinon = require('sinon');
const snapshotState = require('../lib/snapshot-state');

test('snapshot state gets created and returned', t => {
	const stateStub = sinon.stub().returns('state');

	t.plan(3);

	t.doesNotThrow(() => {
		const result = snapshotState.get(stateStub, {
			file: path.join('hello', 'world.test.js'),
			updateSnapshots: false
		});

		t.is(result, 'state');
	});

	t.ok(stateStub.calledWith(
		path.join('hello', 'world.test.js'),
		false,
		path.join('hello', '__snapshots__', 'world.test.js.snap'),
		true
	));

	t.end();
});

test('snapshot state is returned immediately if it already exists', t => {
	const stateSpy = sinon.spy();

	t.plan(3);

	snapshotState.state = 'already made state';

	t.doesNotThrow(() => {
		const result = snapshotState.get(stateSpy);
		t.is(result, 'already made state');
	});

	t.false(stateSpy.called);

	t.end();
});
