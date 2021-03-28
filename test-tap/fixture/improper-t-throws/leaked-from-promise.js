const test = require('../../../entrypoints/main.cjs');

test('test', t => {
	try {
		t.throws(throwSync());
	} catch (error) {
		setImmediate(() => {
			throw error;
		});
	}

	return new Promise(() => {});
});

function throwSync() {
	throw new Error('should be detected');
}
