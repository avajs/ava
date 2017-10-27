import test from '../../';

const getAnonymousFn = () => () => {
	throw new Error();
};

test(t => {
	getAnonymousFn()();
	t.pass();
});
