import test from 'ava';

test('fail', t => {
	t.log(Date.now());
	t.fail();
});
