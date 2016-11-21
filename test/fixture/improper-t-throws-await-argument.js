import test from '../../';

test(async t => {
	const promise = Promise.resolve;
	t.throws(throwSync(await promise));
});

function throwSync() {
	throw new Error('should be detected');
}
