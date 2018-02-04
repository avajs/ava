import test from '../../..';

test('test', t => {
	t.throws(throwSync());
});

function throwSync() {
	throw new Error('should be detected');
}
