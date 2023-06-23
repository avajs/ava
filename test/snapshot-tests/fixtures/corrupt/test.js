const test = require(process.env.TEST_AVA_REQUIRE_FROM);

test('a snapshot', t => {
	t.snapshot('foo');
});

test('a snapshot with a message', t => {
	t.snapshot('foo', 'a message');
});
