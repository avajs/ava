# Endpoint testing

Translations: [Español](https://github.com/avajs/ava-docs/blob/master/es_ES/docs/recipes/endpoint-testing.md), [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/endpoint-testing.md), [Italiano](https://github.com/avajs/ava-docs/blob/master/it_IT/docs/recipes/endpoint-testing.md), [日本語](https://github.com/avajs/ava-docs/blob/master/ja_JP/docs/recipes/endpoint-testing.md), [Português](https://github.com/avajs/ava-docs/blob/master/pt_BR/docs/recipes/endpoint-testing.md), [Русский](https://github.com/avajs/ava-docs/blob/master/ru_RU/docs/recipes/endpoint-testing.md), [简体中文](https://github.com/avajs/ava-docs/blob/master/zh_CN/docs/recipes/endpoint-testing.md)

AVA doesn't have a builtin method for testing endpoints, but you can use any http client of your choosing, for example [got](https://github.com/sindresorhus/got). Next you need to bind a server instance, for that we recommend [test-listen](https://github.com/zeit/test-listen).
Since tests run concurrently, it's best to create a fresh server instance for each test, because if we referenced the same instance, it could be mutated between tests. This can be accomplished with a `test.beforeEach` and `t.context`, or with simply a factory function.
Check out the example below:

```js
const app = require("../app")
const listen = require("test-listen")
const test = require("ava")
const http = require("http")
const got = require('got')

test.before(async t => {
        const server = http.createServer(app);
        t.context.baseURL = await listen(server);
})

test('get /user', async t => {
        const res = await got('/user', { baseURL: t.context.baseURL, json: true });

        t.is(res.body.email, 'ava@rocks.com');

        server.close();
});
```

Other libraries you may find useful: 
- [`supertest`](https://github.com/visionmedia/supertest)
- [`get-port`](https://github.com/sindresorhus/get-port)

