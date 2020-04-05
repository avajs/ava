const test = require('../../..');

test('at expected index', t => {
	t.is(process.env.CI_NODE_INDEX, '2');
});
