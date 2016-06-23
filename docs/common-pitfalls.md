# Common Pitfalls

## AVA in Docker

If you run AVA in Docker as part of your CI, you need to fix the appropriate environment variables. Specifically, adding `-e CI=true` in the `docker exec` command. See [https://github.com/avajs/ava/issues/751](#751).

AVA uses [is-ci](https://github.com/watson/is-ci) to decide if it's in a CI environment or not using [these variables](https://github.com/watson/is-ci/blob/master/index.js).

## AVA and connected client limits

You may be using a service that only allows a limited number of concurrent connections. For example, many database-as-a-service businesses offer a free plan with a limit on how many clients can be using it at the same time. AVA can hit those limits as it runs multiple processes, but well-written services should emit an error or throttle in those cases. If the one you're using doesn't, the tests will hang.

Use the `concurrency` flag to limit the number of processes ran. For example, if your service plan allows 5 clients, you should run AVA with `concurrency=5` or less.

## Async operations

You may be running an async operation inside a test and wondering why it's not finishing. If your async operation uses promises, you should return the promise:

```js
test(t => {
  return fetch().then(data => {
    t.is(data, 'foo');
  });
});
```

If it uses callbacks, use [`test.cb`](https://github.com/avajs/ava#callback-support):

```js
test.cb(t => {
  fetch((err, data) => {
    t.is(data, 'bar');
    t.end();
  });
});
```

Alternatively, promisify the callback function using something like [pify](https://github.com/sindresorhus/pify).

---

Is your problem not listed here? Submit a pull request or comment on [this issue](https://github.com/avajs/ava/issues/404).
