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
const avaAssert = require('../lib/assert');
const beautifyStack = require('../lib/beautify-stack');
const serialize = require('../lib/serialize-error');

// Needed to test stack traces from source map fixtures.
sourceMapSupport.install({environment: 'node'});

function serializeValue(value) {
	return prettyFormat(value, {
		callToJSON: false,
		plugins: [reactTestPlugin],
		highlight: true
	});
}

test('serialize standard props', t => {
	const err = new Error('Hello');
	const serializedErr = serialize(err);

	t.is(Object.keys(serializedErr).length, 6);
	t.is(serializedErr.avaAssertionError, false);
	t.deepEqual(serializedErr.object, {});
	t.is(serializedErr.name, 'Error');
	t.is(serializedErr.stack, beautifyStack(err.stack));
	t.is(serializedErr.message, 'Hello');
	t.is(typeof serializedErr.source.isDependency, 'boolean');
	t.is(typeof serializedErr.source.isWithinProject, 'boolean');
	t.is(typeof serializedErr.source.file, 'string');
	t.is(typeof serializedErr.source.line, 'number');
	t.end();
});

test('additional error properties are preserved', t => {
	const serializedErr = serialize(Object.assign(new Error(), {foo: 'bar'}));
	t.deepEqual(serializedErr.object, {foo: 'bar'});
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

test('sets avaAssertionError to true if indeed an assertion error', t => {
	const err = new avaAssert.AssertionError({});
	const serializedErr = serialize(err);
	t.true(serializedErr.avaAssertionError);
	t.end();
});

test('serialize statements of assertion errors', t => {
	const err = new avaAssert.AssertionError({
		assertion: 'true'
	});
	err.statements = [
		['actual.a[0]', 1],
		['actual.a', [1]],
		['actual', {a: [1]}]
	];

	const serializedErr = serialize(err);
	t.deepEqual(serializedErr.statements, JSON.stringify([
		['actual.a[0]', serializeValue(1)],
		['actual.a', serializeValue([1])],
		['actual', serializeValue({a: [1]})]
	]));
	t.end();
});

test('serialize actual and expected props of assertion errors', t => {
	const err = new avaAssert.AssertionError({
		stackStartFunction: null,
		assertion: 'is',
		actual: 1,
		expected: 'a'
	});

	const serializedErr = serialize(err);
	t.is(serializedErr.actual.formatted, serializeValue(1));
	t.is(serializedErr.expected.formatted, serializeValue('a'));
	t.is(serializedErr.actual.type, 'number');
	t.is(serializedErr.expected.type, 'string');
	t.end();
});

test('only serialize actual and expected props of assertion errors if error was created with one', t => {
	const err = new avaAssert.AssertionError({stackStartFunction: null});

	const serializedErr = serialize(err);
	t.is(serializedErr.actual, undefined);
	t.is(serializedErr.expected, undefined);
	t.end();
});

test('does not call toJSON() when serializing actual and expected', t => {
	const err = new avaAssert.AssertionError({
		assertion: 'is',
		actual: {
			foo: 'bar',
			toJSON() {
				return {
					foo: 'BAR'
				};
			}
		},
		expected: {
			foo: 'thud',
			toJSON() {
				return {
					foo: 'BAR'
				};
			}
		}
	});

	const serializedErr = serialize(err);
	t.notSame(serializedErr.actual.formatted, serializedErr.expected);
	t.end();
});

test('remove non-string error properties', t => {
	const err = {
		name: [42],
		stack: /re/g
	};
	const serializedErr = serialize(err);
	t.is(serializedErr.name, undefined);
	t.is(serializedErr.stack, undefined);
	t.end();
});
