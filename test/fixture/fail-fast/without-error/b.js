const test = require('../../../..');

setTimeout(() => {
	test.serial('pass', t => t.pass());
}, 2000);
