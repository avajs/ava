#Endpoint Testing

AVA doesn't have an official assertion library for endpoints, but a great option is [`supertest-as-promised`](https://github.com/WhoopInc/supertest-as-promised).
Since the tests run concurrently, it's a best practice to create a fresh server instance for each test because if we referenced the same instance, it could be mutated between tests. This can be accomplished with a `beforeEach` and `context`, or even more simply with a factory function:
```
function makeApp() {
  const app = express();
  app.post('/signup', signupHandler);
  return app;
}
```

Next, just inject your server instance into supertest. The only gotcha is to use a promise or async/await syntax instead of supertest's `end` method:
```
test('signup:Success', async t => {
  t.plan(2);
  const app = makeApp();
  const res = await request(app)
    .post('/signup')
    .send({email: 'ava@rocks.com', password: '123123'})
  t.is(res.status, 200);
  t.is(res.body.email, 'ava@rocks.com');
});
```
