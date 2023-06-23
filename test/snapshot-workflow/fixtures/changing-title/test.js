const test = require(process.env.TEST_AVA_REQUIRE_FROM); // This fixture is copied to a temporary directory, so require AVA through its configured path.

test(`a ${process.env.TEMPLATE ? '' : 'new '}title`, t => {
	t.snapshot({foo: 'one'});
});
