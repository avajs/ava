import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {test} from 'tap';

import './helper/chalk0.js'; // eslint-disable-line import/no-unassigned-import
import ContextRef from '../lib/context-ref.js';
import * as snapshotManager from '../lib/snapshot-manager.js';
import Test from '../lib/test.js';
import {set as setOptions} from '../lib/worker/options.cjs';

setOptions({});

function setup(title, manager, fn) {
	return new Test({
		experiments: {},
		fn,
		failWithoutAssertions: true,
		metadata: {type: 'test'},
		contextRef: new ContextRef(),
		registerUniqueTitle: () => true,
		title,
		compareTestSnapshot: options => manager.compare(options),
	});
}

test(async t => {
	// Set to `true` to update the snapshot, then run:
	// npx tap -R spec test-tap/try-snapshot.js
	//
	// Ignore errors and make sure not to run tests with the `-b` (bail) option.
	const updating = false;

	const projectDir = fileURLToPath(new URL('fixture', import.meta.url));
	const manager = snapshotManager.load({
		file: path.join(projectDir, 'try-snapshot.cjs'),
		projectDir,
		fixedLocation: null,
		updating,
		recordNewSnapshots: updating,
	});

	await t.test('try-commit snapshots serially', async t => {
		const ava = setup('serial', manager, async a => {
			a.snapshot('hello');

			const first = await a.try(t2 => {
				t2.snapshot(true);
				t2.snapshot({boo: 'far'});
			});
			first.commit();

			const second = await a.try(t2 => {
				t2.snapshot({foo: 'bar'});
			});
			second.commit();
		});

		const result = await ava.run();
		t.ok(result.passed);
	});

	await t.test('try-commit snapshots concurrently', async t => {
		const ava = setup('concurrent', manager, async a => {
			a.snapshot('hello');

			const [first, second] = await Promise.all([
				a.try(t2 => {
					t2.snapshot(true);
					t2.snapshot({boo: 'far'});
				}),
				a.try(t2 => {
					t2.snapshot({foo: 'bar'});
				}),
			]);
			first.commit();
			second.commit();
		});

		const result = await ava.run();
		t.notOk(result.passed);
		t.ok(result.error);
		t.match(result.error.message, /not run concurrent snapshot assertions when using `t\.try\(\)`/);
		t.equal(result.error.name, 'Error');
	});

	await manager.save();
});
