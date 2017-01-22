import test from '../../../';

const fixture = [1, 2];

test('foo', t => {
	// using destructuring to ensure it transpiles on Node.js 4
	// since that is a Node.js 6 feature
	const [one, two] = fixture;
	t.pass();
});
