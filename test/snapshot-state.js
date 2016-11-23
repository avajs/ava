'use strict';

var test = require('tap').test;
var sinon = require('sinon');
var snapshotState = require('../lib/snapshot-state');

test('snapshot state gets created and returned', function (t) {
	var stateStub = sinon.stub().returns('state');

	t.plan(3);

	t.doesNotThrow(function () {
		var result = snapshotState.get(stateStub, {
			file: 'hello/world.test.js',
			updateSnapshots: false
		});

		t.is(result, 'state');
	});

	t.ok(stateStub.calledWith(
		'hello/world.test.js',
		false,
		'hello/__snapshots__/world.test.js.snap',
		true
	));

	t.end();
});

test('snapshot state is returned immediately if it already exists', function (t) {
	var stateSpy = sinon.spy();

	t.plan(3);

	snapshotState.state = 'already made state';

	t.doesNotThrow(function () {
		var result = snapshotState.get(stateSpy);

		t.is(result, 'already made state');
	});

	t.false(stateSpy.called);

	t.end();
});
