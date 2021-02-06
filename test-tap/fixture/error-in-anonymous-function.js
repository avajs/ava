const test = require('../..');

const getAnonymousFn = () => () => {
	throw new Error();
};

test('test', t => {
	getAnonymousFn()();
	t.pass();
});
