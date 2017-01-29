'use strict';

const prettyFormat = require('pretty-format');
const reactElementPlugin = require('pretty-format/plugins/ReactElement');
const reactTestPlugin = require('pretty-format/plugins/ReactTestComponent');
const renderer = require('react-test-renderer');
const test = require('tap').test;
const beautifyStack = require('../lib/beautify-stack');
const serialize = require('../lib/serialize-error');

function isReactElement(obj) {
	return obj.type && obj.ref !== undefined && obj.props;
}

function serializeValue(value) {
	if (isReactElement(value)) {
		value = renderer.create(value).toJSON();
	}

	return prettyFormat(value, {
		plugins: [reactTestPlugin, reactElementPlugin],
		highlight: true
	});
}

test('serialize standard props', t => {
	const err = new Error('Hello');
	const serializedErr = serialize(err);

	t.is(Object.keys(serializedErr).length, 4);
	t.is(serializedErr.name, 'Error');
	t.is(serializedErr.stack, beautifyStack(err.stack));
	t.is(serializedErr.message, 'Hello');
	t.is(serializedErr.source.file, 'test/serialize-error.js');
	t.is(typeof serializedErr.source.line, 'number');
	t.end();
});

test('serialize statements', t => {
	const err = new Error();
	err.showOutput = true;
	err.statements = [
		['actual.a[0]', 1],
		['actual.a', [1]],
		['actual', {a: [1]}]
	];

	const serializedErr = serialize(err);

	t.true(serializedErr.showOutput);
	t.deepEqual(serializedErr.statements, JSON.stringify([
		['actual.a[0]', serializeValue(1)],
		['actual.a', serializeValue([1])],
		['actual', serializeValue({a: [1]})]
	]));
	t.end();
});

test('skip statements if output is off', t => {
	const err = new Error();
	err.showOutput = false;
	err.statements = [
		['actual.a[0]', 1],
		['actual.a', [1]],
		['actual', {a: [1]}]
	];

	const serializedErr = serialize(err);

	t.false(serializedErr.showOutput);
	t.notOk(serializedErr.statements);
	t.end();
});

test('serialize actual and expected props', t => {
	const err = new Error();
	err.showOutput = true;
	err.actual = 1;
	err.expected = 'a';

	const serializedErr = serialize(err);

	t.true(serializedErr.showOutput);
	t.is(serializedErr.actual, serializeValue(1));
	t.is(serializedErr.expected, serializeValue('a'));
	t.is(serializedErr.actualType, 'number');
	t.is(serializedErr.expectedType, 'string');
	t.end();
});

test('skip actual and expected if output is off', t => {
	const err = new Error();
	err.showOutput = false;
	err.actual = 1;
	err.expected = 'a';

	const serializedErr = serialize(err);

	t.false(serializedErr.showOutput);
	t.notOk(serializedErr.actual);
	t.notOk(serializedErr.expected);
	t.notOk(serializedErr.actualType);
	t.notOk(serializedErr.expectedType);
	t.end();
});
