const test = require(process.env.TEST_AVA_IMPORT_FROM);

test(process.env.TEMPLATE ? 'test\r\n\ttitle' : '  test title  ', t => {
	t.snapshot('Hello, World!');
});
