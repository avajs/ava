const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so import AVA through its configured path.

test("emma", (t) => {
  t.pass();
});

test("frank", async (t) => {
  const bar = Promise.resolve("bar");
  t.is(await bar, "bar");
});

test("gina", async (t) => {
  const { promise, resolve } = Promise.withResolvers();
  setTimeout(resolve, 50);
  return promise.then(() => t.pass());
});

test("harry", async (t) => {
  t.is(1, 2);
});