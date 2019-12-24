const test = require('../..');

test('test', t => {
	t.is(process.cwd(), __dirname);
});
