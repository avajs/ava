import test from 'ava';

// `RegExp.prototype.test()` advances `lastIndex` for a regex with the `g` or `y` flag, so
// reusing one across calls would make the same value pass once and fail the next time.
test('t.regex() with a global regex passes on every call', t => {
	const pattern = /foo/g;

	for (let index = 0; index < 3; index++) {
		t.regex('foo', pattern);
	}
});

test('t.notRegex() with a global regex passes on every call', t => {
	const pattern = /foo/g;

	for (let index = 0; index < 3; index++) {
		t.notRegex('bar', pattern);
	}
});

test('t.throwsAsync() with a global message regex matches on every call', async t => {
	const pattern = /boom/g;

	await Promise.all(Array.from({length: 3}, async () => t.throwsAsync(async () => {
		throw new Error('boom happened');
	}, {message: pattern})));
});
