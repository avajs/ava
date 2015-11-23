'use strict';
var test = require('tap').test;
var logger = require('../lib/logger');

test('beautify stack - removes uninteresting lines', function (t) {
	try {
		fooFunc();
	} catch (e) {
		var stack = logger._beautifyStack(e.stack);
		t.match(stack, /fooFunc/);
		t.match(stack, /barFunc/);
		t.match(e.stack, /Module._compile/);
		t.notMatch(stack, /Module\._compile/);
		t.end();
	}
});

function fooFunc() {
	barFunc();
}

function barFunc() {
	throw new Error();
}

