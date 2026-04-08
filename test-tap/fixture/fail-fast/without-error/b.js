import test from '../../../../entrypoints/main.js';

setTimeout(() => {
	test.serial('pass', t => t.pass());
}, 2000);
