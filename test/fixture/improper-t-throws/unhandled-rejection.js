import test from '../../..';

test.cb('test', t => {
	Promise.resolve().then(() => {
		t.throws(throwSync());
	});

	setTimeout(t.end, 20);
});

function throwSync() {
	throw new Error('should be detected');
}
