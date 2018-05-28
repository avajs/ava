import test from '../../..';

const one = {one: 1};
const two = {two: 2};

test('foo', t => {
	// Using object rest/spread to ensure it transpiles on Node.js 6, since this
	// is a Node.js 8 feature
	const actual = {...one, ...two};
	t.deepEqual(actual, {one: 1, two: 2});
});
