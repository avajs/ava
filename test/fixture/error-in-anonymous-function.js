import test from '../../';

const getAnonymousFn = () => () => {
	throw new Error();
};

test('test', t => {
	getAnonymousFn()();
	t.pass();
});
