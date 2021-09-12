const test = require(process.env.TEST_AVA_IMPORT_FROM);

test('test\r\n\ttitle', t => {
	t.snapshot('Hello, World!');
});

test('test\r\n\ttitle', Object.assign(t => {
	t.snapshot('Hello, World!');
}, {
	title: title => `macro\n${title}`,
}));

