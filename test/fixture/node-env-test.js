const test = require('../..');

test('NODE_ENV is test', t => {
	t.plan(1);
	t.is(process.env.NODE_ENV, 'test');
});
