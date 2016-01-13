'use strict';
var test = require('../../');
var delay = require('delay');
require('./print-lorem-ipsum');

async function testFn(t) {
	await delay(40);
	t.pass();
}

for (var i = 0; i < 400; i++) {
	test.serial('test number ' + i, testFn);
}
