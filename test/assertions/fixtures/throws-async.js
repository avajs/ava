import test from 'ava';

test('throws native error', async t => {
	await t.throwsAsync(async () => {
		throw new Error('foo');
	});
});

test('throws object that extends the error prototype', async t => {
	await t.throwsAsync(async () => {
		throw Object.create(Error.prototype);
	});
});
