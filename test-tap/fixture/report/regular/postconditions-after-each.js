import test from '../../../../entrypoints/main.js';

test.afterEach('check each test', t => {
	t.fail('afterEach failed');
});

test.afterEach.always('check each test after failure', t => {
	t.fail('afterEach.always failed');
});

test.after.always('check file after failure', t => {
	t.fail('after.always failed');
});

test('passing test', t => {
	t.pass();
});
