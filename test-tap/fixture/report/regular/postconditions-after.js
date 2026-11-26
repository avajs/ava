import test from '../../../../entrypoints/main.js';

test.after('check file', t => {
	t.fail('after failed');
});

test('passing test', t => {
	t.pass();
});
