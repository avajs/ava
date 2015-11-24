const test = require('../../');

test('throw an uncaught exception', t => {
	setImmediate(foo);
});

function foo() {
	bar();
}

function bar() {
	throw new Error(`Can't catch me!`)
}
