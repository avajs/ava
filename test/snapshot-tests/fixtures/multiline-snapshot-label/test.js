const test = require(process.env.TEST_AVA_IMPORT_FROM);

const f = () => [
	'Hello',
	'World!',
].join(', ');

test('snapshot with a multiline label', t => {
	const result = f();
	const label = '```javascript\n' + f.toString() + '\n```';
	t.snapshot(result, label);
});
