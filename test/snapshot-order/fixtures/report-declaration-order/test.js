import test from 'ava';

const id = index => `index: ${index}`;

test('B - declare some snapshots', t => {
	t.snapshot(id(0));
	t.snapshot(id(1), 'has a message');
	t.snapshot(id(2), 'also has a message');
});

test('A - declare some more snapshots', t => {
	t.snapshot(id(4));
});

test('C - declare some snapshots in a try()', async t => {
	t.snapshot(id(5), 'outer');
	const attempt = await t.try('trying', t => {
		t.snapshot(id(6), 'inner');
	});
	attempt.commit();
	t.snapshot(id(7), 'outer again');
});

test('E - discard some snapshots in a try()', async t => {
	t.snapshot(id(8), 'outer');
	const attempt = await t.try('trying', t => {
		t.snapshot(id(9), 'inner');
	});
	attempt.discard();
	t.snapshot(id(10), 'outer again');
});

test('D - more snapshots with IDs', t => {
	t.snapshot(id(12));
	t.snapshot(id(13));
});
