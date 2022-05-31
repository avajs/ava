# Endpoint testing

Translations: [Español](https://github.com/avajs/ava-docs/blob/main/es_ES/docs/recipes/endpoint-testing.md), [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/endpoint-testing.md), [Italiano](https://github.com/avajs/ava-docs/blob/main/it_IT/docs/recipes/endpoint-testing.md), [日本語](https://github.com/avajs/ava-docs/blob/main/ja_JP/docs/recipes/endpoint-testing.md), [Português](https://github.com/avajs/ava-docs/blob/main/pt_BR/docs/recipes/endpoint-testing.md), [Русский](https://github.com/avajs/ava-docs/blob/main/ru_RU/docs/recipes/endpoint-testing.md), [简体中文](https://github.com/avajs/ava-docs/blob/main/zh_CN/docs/recipes/endpoint-testing.md)

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/avajs/ava/tree/main/examples/endpoint-testing?file=test.js&terminal=test&view=editor)

AVA doesn't have a built-in method for testing endpoints, but you can use any HTTP client of your choosing, for example [`got`](https://github.com/sindresorhus/got). You'll also need to start an HTTP server, preferably on a unique port so that you can run tests in parallel. For that we recommend [`test-listen`](https://github.com/zeit/test-listen).

Since tests run concurrently, it's best to create a fresh server instance at least for each test file, but perhaps even for each test. This can be accomplished with `test.before()` and `test.beforeEach()` hooks and `t.context`. If you start your server using a `test.before()` hook you should make sure to execute your tests serially.

Check out the example below:

```js
import http from 'http';
import test from 'ava';
import got from 'got';
import listen from 'test-listen';
import app from '../app';

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
```

Other libraries you may find useful:

- [`supertest`](https://github.com/visionmedia/supertest)
- [`get-port`](https://github.com/sindresorhus/get-port)
