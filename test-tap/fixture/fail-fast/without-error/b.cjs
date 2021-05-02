const test = require('../../../../entrypoints/main.cjs');

setTimeout(() => {
	test.serial('pass', t => t.pass());
}, 2000);
