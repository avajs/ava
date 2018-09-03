import test from '../../..';

test('test', t => {
	try {
		t.throws(throwSync());
	} catch (error) {
		setTimeout(() => {
			throw error;
		}, 500);
	}
});

function throwSync() {
	throw new Error('should be detected');
}
