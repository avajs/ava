const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM);

test('code block snapshots', t => {
	t.snapshot('hello world', {formatAsCodeBlock: true});
	t.snapshot('console.log("hello")', {formatAsCodeBlock: 'javascript'});
	t.snapshot('text with ``` backticks ```', {formatAsCodeBlock: true});
});
