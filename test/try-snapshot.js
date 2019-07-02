'use strict';
require('../lib/chalk').set();
require('../lib/worker/options').set({color: false});

const path = require('path');
const {test} = require('tap');
const snapshotManager = require('../lib/snapshot-manager');
const Test = require('../lib/test');
const ContextRef = require('../lib/context-ref');

function setup(title, manager, fn) {
	return new Test({
		fn,
		failWithoutAssertions: true,
		metadata: {type: 'test', callback: false},
		contextRef: new ContextRef(),
		registerUniqueTitle: () => true,
		title,
		compareTestSnapshot: options => manager.compare(options)
	});
}

test(async t => {
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

	await t.test('try-commit snapshots serially', t => {
		const ava = setup('serial', manager, a => {
			a.snapshot('hello');

			const attempt1 = t2 => {
				t2.snapshot(true);
				t2.snapshot({boo: 'far'});
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
			t.true(result.passed);
		});
	});

	await t.test('try-commit snapshots concurrently', t => {
		const ava = setup('concurrent', manager, a => {
			a.snapshot('hello');

			const attempt1 = t2 => {
				t2.snapshot(true);
				t2.snapshot({boo: 'far'});
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
			t.false(result.passed);
			t.ok(result.error);
			t.match(result.error.message, /not run concurrent snapshot assertions when using `t\.try\(\)`/);
			t.is(result.error.name, 'Error');
		});
	});

	manager.save();
});
