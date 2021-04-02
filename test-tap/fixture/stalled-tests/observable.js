const Observable = require('zen-observable');
const test = require('../../../entrypoints/main.cjs');

test('test', t => {
	return new Observable(() => {
		t.pass();
	});
});
