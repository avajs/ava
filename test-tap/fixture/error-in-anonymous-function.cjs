const test = require('../../entrypoints/main.cjs');

const getAnonymousFn = () => () => {
	throw new Error(); // eslint-disable-line unicorn/error-message
};

test('test', t => {
	getAnonymousFn()();
	t.pass();
});
