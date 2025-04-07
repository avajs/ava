const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so import AVA through its configured path.

test("alice", (t) => {
  t.pass();
});

test("bob", async (t) => {
  t.pass();
});

test("catherine", async (t) => {
  t.pass();
});

test("david", async (t) => {
  t.fail();
});
