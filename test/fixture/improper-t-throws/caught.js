import test from '../../..';

test('test', t => {
	try {
		t.throws(throwSync());
	} catch (_) {}
});

function throwSync() {
	throw new Error('should be detected');
}
