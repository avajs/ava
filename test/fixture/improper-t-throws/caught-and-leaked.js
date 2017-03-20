import test from '../../..';

test(t => {
	try {
		t.throws(throwSync());
	} catch (err) {
		setImmediate(() => {
			throw err;
		});
	}
});

function throwSync() {
	throw new Error('should be detected');
}
