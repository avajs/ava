const test = require(process.env.TEST_AVA_REQUIRE_FROM); // This fixture is copied to a temporary directory, so require AVA through its configured path.

test('without snapshots', t => {
	t.pass();
});
