'use strict';

var test = require('../../');

test('throw an uncaught exception', function (t) {
	setImmediate(foo);
});

function foo() {
	bar();
}

function bar() {
	throw new Error('Can\'t catch me!');
}

//# sourceMappingURL=./initial-source-map-exception.map

/* original source:
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
*/
