const test = require('../../entrypoints/main.cjs');

test('NODE_ENV is test', t => {
	t.plan(1);
	t.is(process.env.NODE_ENV, 'test');
});
