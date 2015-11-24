import test from '../../';

test('Array.of support', t => {
	const arr10 = Array.of(10);
	t.is(arr10.length, 1);
	t.is(arr10[0], 10);
	t.end();
});

test('Array.from support', t => {
	const arr = Array.from({
		length: 2,
		0: 0,
		1: 1
	});

	t.true(Array.isArray(arr));
	t.is(arr.length, 2);
	t.is(arr[0], 0);
	t.is(arr[1], 1);
	t.end();
});

test('Object.assign support', t => {
	const target = {bar: 'baz'};
	Object.assign(target, {foo: 'bar'});
	t.same(target, {foo: 'bar', bar: 'baz'});
	t.end();
});

test('Number.isFinite support', t => {
	t.true(Number.isFinite(4));
	t.false(Number.isFinite(Infinity));
	t.end();
});

test('Math.isFinite support', t => {
	t.true(Number.isFinite(4));
	t.false(Number.isFinite(Infinity));
	t.end();
});

// TODO: These polyfills are not working.
test.skip('Math.sign support', t => {
	t.is(Math.sign(3), 1);
	t.is(Math.sign(-3), -1);
	t.end();
});

test.skip('String.fromCodePoint', t => {
	t.is(String.fromCodePoint(42), '*');
	t.end();
});
