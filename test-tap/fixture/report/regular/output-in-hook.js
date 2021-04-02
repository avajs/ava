const test = require('../../../../entrypoints/main.cjs');

test.before(() => {});

test.before(t => {
	t.log('before');
});

test.after('cleanup', t => {
	t.log('after');
});

test.after.always('cleanup', t => {
	t.log('afterAlways');
});

test.beforeEach(t => {
	t.log('beforeEach');
});

test.afterEach(t => {
	t.log('afterEach');
});

test.afterEach.always(t => {
	t.log('afterEachAlways');
});

test('passing test', t => {
	t.pass();
});

test('failing test', t => {
	t.fail();
});
