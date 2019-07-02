'use strict';
require('../lib/chalk').set();
require('../lib/worker/options').set({color: false});

const path = require('path');
const {test} = require('tap');
const snapshotManager = require('../lib/snapshot-manager');
const Test = require('../lib/test');
const ContextRef = require('../lib/context-ref');

function setup(title, fn) {
	// Set to `true` to update the snapshot, then run:
	// "$(npm bin)"/tap --no-cov -R spec test/try-snapshot.js
	//
	// Ignore errors and make sure not to run tests with the `-b` (bail) option.
	const updating = false;

	const projectDir = path.join(__dirname, 'fixture');
	const manager = snapshotManager.load({
		file: path.join(projectDir, 'try-snapshot.js'),
		projectDir,
		fixedLocation: null,
		updating,
		recordNewSnapshots: updating
	});

	const ava = new Test({
		fn,
		failWithoutAssertions: true,
		metadata: {type: 'test', callback: false},
		contextRef: new ContextRef(),
		registerUniqueTitle: () => true,
		title,
		compareTestSnapshot: options => manager.compare(options)
	});

	return {ava, manager};
}

test('try-commit snapshots serially', t => {
	const {ava, manager} = setup('serial', a => {
		a.snapshot('hello');

		const attempt1 = t2 => {
			t2.snapshot(true);
		};

		const attempt2 = t2 => {
			t2.snapshot({foo: 'bar'});
		};

		return a.try(attempt1).then(first => {
			first.commit();
			return a.try(attempt2);
		}).then(second => {
			second.commit();
		});
	});

	return ava.run().then(result => {
		manager.save();
		t.true(result.passed);
		if (!result.passed) {
			console.log(result.error);
		}
	});
});

test('try-commit snapshots concurrently', t => {
	const {ava, manager} = setup('concurrent', a => {
		a.snapshot('hello');

		const attempt1 = t2 => {
			t2.snapshot(true);
		};

		const attempt2 = t2 => {
			t2.snapshot({foo: 'bar'});
		};

		return Promise.all([a.try(attempt1), a.try(attempt2)])
			.then(([first, second]) => {
				first.commit();
				second.commit();
			});
	});

	return ava.run().then(result => {
		manager.save();
		t.true(result.passed);
		if (!result.passed) {
			console.log(result.error);
		}
	});
});
