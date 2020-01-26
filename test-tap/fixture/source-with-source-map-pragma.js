'use strict';

module.exports = foo;

function foo() {
	bar();
}

function bar() {
	throw new Error('Can\'t catch me!');
}

// eslint-disable-next-line spaced-comment
//# sourceMappingURL=./source-with-source-map-pragma.map

/* original source:
module.exports = foo

function foo() {
	bar()
}

function bar() {
	throw new Error(`Can't catch me!`)
}
*/
