import test from 'ava';

test('throws native error', t => {
	t.throws(() => {
		throw new Error('foo');
	});
});

test('throws object that extends the error prototype', t => {
	t.throws(() => {
		throw Object.create(Error.prototype);
	});
});
