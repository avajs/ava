const Observable = require('zen-observable');
const test = require('../../..');

test('test', t => {
	return new Observable(() => {
		t.pass();
	});
});
