const Observable = require('zen-observable');

const test = require('../../../entrypoints/main.cjs');

test('test', t => new Observable(() => {
	t.pass();
}));
