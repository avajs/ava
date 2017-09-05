'use strict';
const proxyquire = require('proxyquire').noPreserveCache();
const test = require('tap').test;

const beautifyStack = proxyquire('../lib/beautify-stack', {
	debug() {
		return {
			enabled: false
		};
	}
});

function fooFunc() {
	barFunc();
}

function barFunc() {
	throw new Error();
}

test('does not strip ava internals and dependencies from stack trace with debug enabled', t => {
	const beautify = proxyquire('../lib/beautify-stack', {
		debug() {
			return {
				enabled: true
			};
		}
	});

	const result = beautify(
		'Error: TypeError\n' +
		'at null._onTimeout (node_modules/ava/cli.js:27:11)\n' +
		'at Stub.listOnTimeout (timers.js:119:15)\n'
	);

	t.true(result.includes('ava/cli.js'));
	t.end();
});

test('strips ava internals and dependencies from stack trace with debug disabled', t => {
	const result = beautifyStack(
		'Error: TypeError\n' +
		'at null._onTimeout (node_modules/ava/cli.js:27:11)\n' +
		'at Stub.listOnTimeout (timers.js:119:15)\n'
	);

	t.false(result.includes('ava/cli.js'));
	t.end();
});

test('returns empty string without any arguments', t => {
	t.is(beautifyStack(), '');
	t.end();
});

test('beautify stack - removes uninteresting lines', t => {
	try {
		fooFunc();
	} catch (err) {
		const stack = beautifyStack(err.stack);
		t.match(stack, /fooFunc/);
		t.match(stack, /barFunc/);
		t.match(err.stack, /Module._compile/);
		t.notMatch(stack, /Module\._compile/);
		t.end();
	}
});
