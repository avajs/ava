/* eslint-disable unicorn/filename-case */
const test = require('../../../../entrypoints/main.cjs');

test('at expected index', t => {
	t.is(process.env.CI_NODE_INDEX, '1');
});
