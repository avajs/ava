'use strict';
const http = require('http');

const test = require('ava');
const listen = require('test-listen');

const app = require('./app.js');

import('got').then(({got}) => {
	test.before(async t => {
		t.context.server = http.createServer(app);
		t.context.prefixUrl = await listen(t.context.server);
	});

	test.after.always(t => {
		t.context.server.close();
	});

	test.serial('get /user', async t => {
		const {email} = await got('user', {prefixUrl: t.context.prefixUrl}).json();

		t.is(email, 'ava@rocks.com');
	});
});

