import test from '../../';

const getAnonymousFn = () => () => {
	throw Error();
};

test(t => {
	getAnonymousFn()();
});
