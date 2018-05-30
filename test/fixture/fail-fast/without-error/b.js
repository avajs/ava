import test from '../../../..';

setTimeout(() => {
	test.serial('pass', t => t.pass());
}, 2000);
