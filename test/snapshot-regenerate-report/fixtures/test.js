import test from 'ava';

function randomDelay(max) {
	return new Promise(resolve => {
		setTimeout(resolve, Math.random() * max);
	});
}

test('some snapshots', t => {
	t.snapshot({foo: 42});
	t.snapshot('bar', 'a message');
});

test('no snapshots', t => {
	t.pass();
});

test('async with some snapshots', async t => {
	t.snapshot(['baz']);
	await t.notThrowsAsync(randomDelay(100));
	t.snapshot(['quux']);
});

test('more snapshots', t => {
	t.snapshot(['hello', 'world'], 'again');
});

test('async again', async t => {
	await t.notThrowsAsync(randomDelay(100));
	t.snapshot(null, 'delayed');
});
