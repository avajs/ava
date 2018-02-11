import test from 'ava';

test('strings', t => {
	const actual = 'this is amazing';
	const expected = 'this is cool';
	t.is(actual, expected);
});
