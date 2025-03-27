const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so import AVA through its configured path.

test("alice", (t) => {
  t.pass();
});

test("bob", async (t) => {
  const bar = Promise.resolve("bar");
  t.is(await bar, "bar");
});

test("catherine", async (t) => {
  t.is(1, 1);
});

test("david", async (t) => {
  t.is(1, 2);
});