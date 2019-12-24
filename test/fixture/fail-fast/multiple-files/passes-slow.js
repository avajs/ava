const test = require('../../../..');

test.serial('first pass', t => {
	t.pass();
	return new Promise(resolve => setTimeout(resolve, 3000));
});

test.serial('second pass', t => {
	t.pass();
});

test('third pass', t => {
	t.pass();
});
