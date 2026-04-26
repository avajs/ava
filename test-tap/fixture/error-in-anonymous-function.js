import test from '../../entrypoints/main.js';

const getAnonymousFn = () => () => {
	throw new Error();
};

test('test', t => {
	getAnonymousFn()();
	t.pass();
});
