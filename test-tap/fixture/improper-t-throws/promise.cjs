const test = require('../../../entrypoints/main.cjs');

test('test', t => {
	return Promise.resolve().then(() => { // eslint-disable-line promise/prefer-await-to-then
		t.throws(throwSync());
	});
});

function throwSync() {
	throw new Error('should be detected');
}
