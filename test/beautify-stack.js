'use strict';
require('../lib/worker/options').set({});

const proxyquire = require('proxyquire').noPreserveCache();
const test = require('tap').test;
const Runner = require('../lib/runner');

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
	throw new Error(); // eslint-disable-line unicorn/error-message
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
		const runner = new Runner();
		runner.runSingle({
			run() {
				fooFunc();
			}
		});
	} catch (err) {
		const stack = beautifyStack(err.stack);
		t.match(stack, /fooFunc/);
		t.match(stack, /barFunc/);
		// The runSingle line is introduced by Runner. It's internal so it should
		// be stripped.
		t.match(err.stack, /runSingle/);
		t.notMatch(stack, /runSingle/);
		t.end();
	}
});
