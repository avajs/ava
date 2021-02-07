import test from 'ava';

test('works', t => {
	t.is(process.env.MY_ENVIRONMENT_VARIABLE, 'some value');
});
