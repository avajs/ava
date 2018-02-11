import test from '../../..';

test('test', t => {
	try {
		t.throws(throwSync());
	} catch (err) {
		setImmediate(() => {
			throw err;
		});
	}

	return new Promise(() => {});
});

function throwSync() {
	throw new Error('should be detected');
}
