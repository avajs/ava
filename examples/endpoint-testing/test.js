import {createServer} from 'node:http';

import {listen} from 'async-listen';
import test from 'ava';
import ky, {HTTPError} from 'ky';

import app from './app.js';

test.before(async t => {
	t.context.server = createServer(app);
	t.context.prefixUrl = await listen(t.context.server);
});

test.after.always(t => {
	t.context.server.close();
});

test.serial('get /user', async t => {
	const {email} = await ky('user', {prefixUrl: t.context.prefixUrl}).json();

	t.is(email, 'ava@rocks.com');
});

test.serial('404', async t => {
	await t.throwsAsync(
		ky('password', {prefixUrl: t.context.prefixUrl}),
		{message: /Request failed with status code 404 Not Found/, instanceOf: HTTPError},
	);
});
