const test = require('../../../..');
const dependency = require('./source');

test('works', t => {
	t.truthy(dependency);
});
