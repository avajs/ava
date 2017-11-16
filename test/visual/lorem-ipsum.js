'use strict';
const delay = require('delay');
const test = require('../..');
require('./print-lorem-ipsum'); // eslint-disable-line import/no-unassigned-import

async function testFn(t) {
	await delay(40);
	t.pass();
}

async function failFn(t) {
	await delay(40);
	t.fail();
}

for (let i = 0; i < 400; i++) {
	test.serial('test number ' + i, i === 125 ? failFn : testFn);
}
