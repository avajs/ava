import test from '../../..';

test('test', t => {
	try {
		t.throws(throwSync());
	} catch (err) {
		setTimeout(() => {
			throw err;
		}, 1500);
	}
});

function throwSync() {
	throw new Error('should be detected');
}
