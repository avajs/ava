import test from '../../..';

test.cb(t => {
	setTimeout(() => {
		t.throws(throwSync());
	});
});

function throwSync() {
	throw new Error('should be detected');
}
