import test from '../../../..';

// eslint-disable-next-line require-await
test.serial('first pass', async t => {
	t.pass();
	return new Promise(resolve => setTimeout(resolve, 3000));
});

test.serial('second pass', t => {
	t.pass();
});

test('third pass', t => {
	t.pass();
});
