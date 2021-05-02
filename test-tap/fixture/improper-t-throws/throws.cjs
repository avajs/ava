const test = require('../../../entrypoints/main.cjs');

test('test', t => {
	t.throws(throwSync());
});

function throwSync() {
	throw new Error('should be detected');
}
