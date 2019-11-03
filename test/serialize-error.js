'use strict';
require('../lib/chalk').set();
require('../lib/worker/options').set({});

const fs = require('fs');
const path = require('path');
const makeDir = require('make-dir');
const sourceMapFixtures = require('source-map-fixtures');
const sourceMapSupport = require('source-map-support');
const tempWrite = require('temp-write');
const uniqueTempDir = require('unique-temp-dir');
const {test} = require('tap');
const avaAssert = require('../lib/assert');
const beautifyStack = require('../lib/beautify-stack');
const serializeError = require('../lib/serialize-error');

const serialize = error => serializeError('Test', true, error);

// Needed to test stack traces from source map fixtures.
sourceMapSupport.install({environment: 'node'});

const makeTempDir = () => {
	if (process.platform !== 'win32') {
		return uniqueTempDir({create: true});
	}

	const dir = path.join(__dirname, '.tmpdir', `serialize-error.${process.pid}`);
	makeDir.sync(dir);
	return dir;
};

test('serialize standard props', t => {
	const error = new Error('Hello');
	const serializedError = serialize(error);

	t.is(Object.keys(serializedError).length, 8);
	t.is(serializedError.avaAssertionError, false);
	t.is(serializedError.nonErrorObject, false);
	t.deepEqual(serializedError.object, {});
	t.is(serializedError.name, 'Error');
	t.is(serializedError.stack, beautifyStack(error.stack));
	t.is(serializedError.message, 'Hello');
	t.is(serializedError.summary, 'Error: Hello');
	t.is(typeof serializedError.source.isDependency, 'boolean');
	t.is(typeof serializedError.source.isWithinProject, 'boolean');
	t.is(typeof serializedError.source.file, 'string');
	t.is(typeof serializedError.source.line, 'number');
	t.end();
});

test('additional error properties are preserved', t => {
	const serializedError = serialize(Object.assign(new Error(), {foo: 'bar'}));
	t.deepEqual(serializedError.object, {foo: 'bar'});
	t.end();
});

test('source file is an absolute path', t => {
	const error = new Error('Hello');
	const serializedError = serialize(error);

	t.is(serializedError.source.file, __filename);
	t.end();
});

test('source file is an absolute path, after source map correction', t => {
	const fixture = sourceMapFixtures.mapFile('throws');
	try {
		fixture.require().run();
		t.fail('Fixture should have thrown');
	} catch (error) {
		const serializedError = serialize(error);
		t.is(serializedError.source.file, fixture.sourceFile);
		t.end();
	}
});

test('source file is an absolute path, after source map correction, even if already absolute', t => {
	const fixture = sourceMapFixtures.mapFile('throws');
	const map = JSON.parse(fs.readFileSync(fixture.file + '.map'));

	const tmp = makeTempDir();
	const sourceRoot = path.join(tmp, 'src');
	const expectedSourceFile = path.join(sourceRoot, map.file);

	const tmpFile = path.join(tmp, path.basename(fixture.file));
	fs.writeFileSync(tmpFile, fs.readFileSync(fixture.file));
	fs.writeFileSync(tmpFile + '.map', JSON.stringify(Object.assign(map, {sourceRoot}), null, 2));

	try {
		require(tmpFile).run();
		t.fail('Fixture should have thrown');
	} catch (error) {
		const serializedError = serialize(error);
		t.is(serializedError.source.file, expectedSourceFile);
		t.end();
	}
});

test('determines whether source file is within the project', t => {
	const file = tempWrite.sync('module.exports = () => { throw new Error("hello") }');
	try {
		require(file)();
		t.fail('Should have thrown');
	} catch (error_) {
		const serializedError = serialize(error_);
		t.is(serializedError.source.file, file);
		t.is(serializedError.source.isWithinProject, false);
	}

	const error = new Error('Hello');
	const serializedError = serialize(error);
	t.is(serializedError.source.file, __filename);
	t.is(serializedError.source.isWithinProject, true);
	t.end();
});

test('determines whether source file, if within the project, is a dependency', t => {
	const fixture = sourceMapFixtures.mapFile('throws');
	try {
		fixture.require().run();
		t.fail('Fixture should have thrown');
	} catch (error_) {
		const serializedError = serialize(error_);
		t.is(serializedError.source.file, fixture.sourceFile);
		t.is(serializedError.source.isWithinProject, true);
		t.is(serializedError.source.isDependency, true);
	}

	const error = new Error('Hello');
	const serializedError = serialize(error);
	t.is(serializedError.source.file, __filename);
	t.is(serializedError.source.isDependency, false);
	t.end();
});

test('sets avaAssertionError to true if indeed an assertion error', t => {
	const error = new avaAssert.AssertionError({});
	const serializedError = serialize(error);
	t.true(serializedError.avaAssertionError);
	t.end();
});

test('includes statements of assertion errors', t => {
	const error = new avaAssert.AssertionError({
		assertion: 'true'
	});
	error.statements = [
		['actual.a[0]', '1'],
		['actual.a', '[1]'],
		['actual', '{a: [1]}']
	];

	const serializedError = serialize(error);
	t.is(serializedError.statements, error.statements);
	t.end();
});

test('includes values of assertion errors', t => {
	const error = new avaAssert.AssertionError({
		assertion: 'is',
		values: [{label: 'actual:', formatted: '1'}, {label: 'expected:', formatted: 'a'}]
	});

	const serializedError = serialize(error);
	t.is(serializedError.values, error.values);
	t.end();
});

test('remove non-string error properties', t => {
	const error = {
		name: [42],
		stack: /re/g
	};
	const serializedError = serialize(error);
	t.is(serializedError.name, undefined);
	t.is(serializedError.stack, undefined);
	t.end();
});

test('creates multiline summaries for syntax errors', t => {
	const error = new SyntaxError();
	Object.defineProperty(error, 'stack', {
		value: 'Hello\nThere\nSyntaxError here\nIgnore me'
	});
	const serializedError = serialize(error);
	t.is(serializedError.name, 'SyntaxError');
	t.is(serializedError.summary, 'Hello\nThere\nSyntaxError here');
	t.end();
});

test('skips esm enhancement lines when finding the summary', t => {
	const error = new Error();
	Object.defineProperty(error, 'stack', {
		value: 'file://file.js:1\nFirst line\nSecond line'
	});
	const serializedError = serialize(error);
	t.is(serializedError.summary, 'First line\nSecond line');
	t.end();
});

test('works around esm\'s insertion of file:// urls', t => {
	const fixture = sourceMapFixtures.mapFile('throws');
	try {
		fixture.require().run();
		t.fail('Fixture should have thrown');
	} catch (error) {
		const expected = serialize(error);
		Object.defineProperty(error, 'stack', {
			value: error.stack.split('\n').map(line => line.replace('(/', '(file:///')).join('\n')
		});
		const serializedError = serialize(error);
		t.is(serializedError.source.file, expected.source.file);
		t.end();
	}
});
