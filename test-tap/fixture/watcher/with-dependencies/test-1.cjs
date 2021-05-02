const test = require('../../../../entrypoints/main.cjs');

const dependency = require('./source');

test('works', t => {
	t.truthy(dependency);
});
