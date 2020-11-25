const test = require('ava');

const id = index => `index: ${index}`;

test.before(t => {
	t.snapshot(id(-2), 'in a before hook');
});

test.beforeEach(t => {
	t.snapshot(id(-1.5), 'in a beforeEach hook');
});

test.afterEach(t => {
	t.snapshot(id(-1), 'in an afterEach hook');
});

test.afterEach.always(t => {
	t.snapshot(id(-0.5), 'in an afterEachAlways hook');
});

test('B - declare some snapshots', t => {
	t.snapshot(id(0));
	t.snapshot(id(1), 'has a message');
	t.snapshot(id(2), 'also has a message');
	t.snapshot(id(3), {id: 'has an ID'});
});

test('A - declare some more snapshots', t => {
	t.snapshot(id(4));
});

test('C - declare some snapshots in a try()', async t => {
	t.snapshot(id(5), 'outer');
	(await t.try('trying', t => {
		t.snapshot(id(6), 'inner');
	})).commit();
	t.snapshot(id(7), 'outer again');
});

test('E - discard some snapshots in a try()', async t => {
	t.snapshot(id(8), 'outer');
	(await t.try('trying', t => {
		t.snapshot(id(9), 'inner');
	})).discard();
	t.snapshot(id(10), 'outer again');
});

test('D - more snapshots with IDs', t => {
	t.snapshot(id(11), {id: 'the first in test D'});
	t.snapshot(id(12));
	// These have to be reported in reverse declaration order, because they can't
	// be reported under the same header
	t.snapshot(id(14), {id: 'the second-to-last in test D'});
	t.snapshot(id(13));
});
