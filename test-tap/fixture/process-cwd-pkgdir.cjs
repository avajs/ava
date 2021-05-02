const test = require('../../entrypoints/main.cjs');

test('test', t => {
	t.is(process.cwd(), __dirname);
});
