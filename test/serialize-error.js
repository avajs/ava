'use strict';

const fs = require('fs');
const path = require('path');
const prettyFormat = require('@ava/pretty-format');
const reactTestPlugin = require('@ava/pretty-format/plugins/ReactTestComponent');
const sourceMapFixtures = require('source-map-fixtures');
const sourceMapSupport = require('source-map-support');
const tempWrite = require('temp-write');
const uniqueTempDir = require('unique-temp-dir');
const test = require('tap').test;
const beautifyStack = require('../lib/beautify-stack');
const serialize = require('../lib/serialize-error');

// Needed to test stack traces from source map fixtures.
sourceMapSupport.install({environment: 'node'});

function serializeValue(value) {
	return prettyFormat(value, {
		plugins: [reactTestPlugin],
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
	t.is(typeof serializedErr.source.isDependency, 'boolean');
	t.is(typeof serializedErr.source.isWithinProject, 'boolean');
	t.is(typeof serializedErr.source.file, 'string');
	t.is(typeof serializedErr.source.line, 'number');
	t.end();
});

test('source file is an absolute path', t => {
	const err = new Error('Hello');
	const serializedErr = serialize(err);

	t.is(serializedErr.source.file, __filename);
	t.end();
});

test('source file is an absolute path, after source map correction', t => {
	const fixture = sourceMapFixtures.mapFile('throws');
	try {
		fixture.require().run();
		t.fail('Fixture should have thrown');
	} catch (err) {
		const serializedErr = serialize(err);
		t.is(serializedErr.source.file, fixture.sourceFile);
		t.end();
	}
});

test('source file is an absolute path, after source map correction, even if already absolute', t => {
	const fixture = sourceMapFixtures.mapFile('throws');
	const map = JSON.parse(fs.readFileSync(fixture.file + '.map'));

	const tmp = uniqueTempDir({create: true});
	const sourceRoot = path.join(tmp, 'src');
	const expectedSourceFile = path.join(sourceRoot, map.file);

	const tmpFile = path.join(tmp, path.basename(fixture.file));
	fs.writeFileSync(tmpFile, fs.readFileSync(fixture.file));
	fs.writeFileSync(tmpFile + '.map', JSON.stringify(Object.assign(map, {sourceRoot}), null, 2));

	try {
		require(tmpFile).run(); // eslint-disable-line import/no-dynamic-require
		t.fail('Fixture should have thrown');
	} catch (err) {
		const serializedErr = serialize(err);
		t.is(serializedErr.source.file, expectedSourceFile);
		t.end();
	}
});

test('determines whether source file is within the project', t => {
	const file = tempWrite.sync('module.exports = () => { throw new Error("hello") }');
	try {
		require(file)(); // eslint-disable-line import/no-dynamic-require
		t.fail('Should have thrown');
	} catch (err) {
		const serializedErr = serialize(err);
		t.is(serializedErr.source.file, file);
		t.is(serializedErr.source.isWithinProject, false);
	}

	const err = new Error('Hello');
	const serializedErr = serialize(err);
	t.is(serializedErr.source.file, __filename);
	t.is(serializedErr.source.isWithinProject, true);
	t.end();
});

test('determines whether source file, if within the project, is a dependency', t => {
	const fixture = sourceMapFixtures.mapFile('throws');
	try {
		fixture.require().run();
		t.fail('Fixture should have thrown');
	} catch (err) {
		const serializedErr = serialize(err);
		t.is(serializedErr.source.file, fixture.sourceFile);
		t.is(serializedErr.source.isWithinProject, true);
		t.is(serializedErr.source.isDependency, true);
	}

	const err = new Error('Hello');
	const serializedErr = serialize(err);
	t.is(serializedErr.source.file, __filename);
	t.is(serializedErr.source.isDependency, false);
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
