const test = require('../../../../entrypoints/main.cjs');

const dependency = require('./source.cjs');

test('works', t => {
	t.truthy(dependency);
});
