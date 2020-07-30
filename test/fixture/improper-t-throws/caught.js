import test from '../../..';

test('test', t => {
	try {
		t.throws(throwSync());
	} catch (_) {} // eslint-disable-line unicorn/prefer-optional-catch-binding
});

function throwSync() {
	throw new Error('should be detected');
}
