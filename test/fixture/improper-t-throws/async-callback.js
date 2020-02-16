const test = require('../../..');

test.cb('test', t => {
	setTimeout(() => {
		t.throws(throwSync());
	});
});

function throwSync() {
	throw new Error('should be detected');
}
