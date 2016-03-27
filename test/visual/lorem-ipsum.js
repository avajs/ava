'use strict';
var delay = require('delay');
var test = require('../../');
require('./print-lorem-ipsum');

async function testFn(t) {
	await delay(40);
	t.pass();
}

async function failFn(t) {
	await delay(40);
	t.fail();
}

for (var i = 0; i < 400; i++) {
	test.serial('test number ' + i, i === 125 ? failFn : testFn);
}
