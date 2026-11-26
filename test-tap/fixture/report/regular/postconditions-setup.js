import test from '../../../../entrypoints/main.js';

test.before('prepare file', t => {
	t.fail('setup failed');
});

test('not run', t => {
	t.pass();
});
