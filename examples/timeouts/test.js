'use strict';
const test = require('ava');

const {delay} = require('.');

test('start server', async t => {
	t.timeout(100);

	await delay(50);

	t.pass();
});

test('connect with database', async t => {
	t.timeout(100, 'make sure database has started');

	await delay(200);

	t.pass();
});

test('very long and slow operation', async t => {
	await delay(3000);

	t.pass();
});
