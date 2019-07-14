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

	await t.test('try-commit snapshots serially', async t => {
		const ava = setup('serial', manager, async a => {
			a.snapshot('hello');

			const attempt1 = t2 => {
				t2.snapshot(true);
				t2.snapshot({boo: 'far'});
			};

			const attempt2 = t2 => {
				t2.snapshot({foo: 'bar'});
			};

			const first = await a.try(attempt1);
			first.commit();

			const second = await a.try(attempt2);
			second.commit();
		});

		const result = await ava.run();
		t.true(result.passed);
	});

	await t.test('try-commit snapshots concurrently', async t => {
		const ava = setup('concurrent', manager, async a => {
			a.snapshot('hello');

			const attempt1 = t2 => {
				t2.snapshot(true);
				t2.snapshot({boo: 'far'});
			};

			const attempt2 = t2 => {
				t2.snapshot({foo: 'bar'});
			};

			const [first, second] = await Promise.all([
				a.try(attempt1),
				a.try(attempt2)
			]);
			first.commit();
			second.commit();
		});

		const result = await ava.run();
		t.false(result.passed);
		t.ok(result.error);
		t.match(result.error.message, /not run concurrent snapshot assertions when using `t\.try\(\)`/);
		t.is(result.error.name, 'Error');
	});

	manager.save();
});
