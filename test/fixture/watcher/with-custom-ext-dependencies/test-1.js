const test = require('../../../..');
const dependency = require('./source.custom-ext');

test('works', t => {
	t.truthy(dependency);
});
