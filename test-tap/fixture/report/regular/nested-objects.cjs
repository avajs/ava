const util = require('util'); // eslint-disable-line unicorn/import-style

const { test } = require('../../../../entrypoints/main.cjs');

util.inspect.defaultOptions.depth = 4;

test('format with max depth 4', t => {
	const exp = {
		a: {
			b: {
				foo: 'bar',
			},
		},
	};
	const act = {
		a: {
			b: {
				foo: 'bar',
			},
		},
		c: {
			d: {
				e: {
					foo: 'bar',
				},
			},
		},
	};
	t.deepEqual(exp, act);
});

test('format like with max depth 4', t => {
	const pattern = {
		a: {
			b: {
				foo: 'qux',
			},
		},
	};
	const actual = {
		a: {
			b: {
				foo: 'bar',
				extra: 'irrelevant',
			},
		},
		c: {
			d: {
				e: {
					foo: 'bar',
				},
			},
		},
	};
	t.like(actual, pattern);
});
