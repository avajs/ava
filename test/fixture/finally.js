import test from '../../';

let val = 0

test.serial('finally setting', t => {
	t.finally(() => {
		val = 1;
	});
});

test.serial('getting the value that was set', t => {
	t.is(val, 1);
});
