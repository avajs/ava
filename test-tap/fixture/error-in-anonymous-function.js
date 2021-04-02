const test = require('../../entrypoints/main.cjs');

const getAnonymousFn = () => () => {
	throw new Error();
};

test('test', t => {
	getAnonymousFn()();
	t.pass();
});
