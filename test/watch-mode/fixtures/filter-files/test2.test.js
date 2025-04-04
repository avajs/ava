const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so import AVA through its configured path.

test("emma", (t) => {
  t.pass();
});

test("frank", async (t) => {
  const bar = Promise.resolve("bar");
  t.is(await bar, "bar");
});

test("gina", async (t) => {
  t.is(1, 1);
});

test("harry", async (t) => {
  t.is(1, 2);
});
