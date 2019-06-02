'use strict';
const path = require('path');
const {test} = require('tap');

const {load} = require('../eslint-plugin-helper');

const projectDir = path.join(__dirname, 'fixture/eslint-plugin-helper');
const overrideDir = path.join(__dirname, 'fixture/eslint-plugin-helper/for-overriding');

test('caches loaded configuration', t => {
	const expected = load(projectDir);
	t.is(expected, load(projectDir));

	const withOverride = load(projectDir, {});
	t.not(expected, withOverride);
	t.is(withOverride, load(projectDir, {}));

	t.end();
});

test('classifies files according to the configuration', t => {
	const helper = load(projectDir);
	t.deepEqual(helper.classifyFile(path.join(projectDir, 'tests/test.foo')), {
		isHelper: false,
		isSource: false,
		isTest: true
	});
	t.deepEqual(helper.classifyFile(path.join(projectDir, 'tests/_helper.foo')), {
		isHelper: true,
		isSource: false,
		isTest: false
	});
	t.deepEqual(helper.classifyFile(path.join(projectDir, 'helpers/helper.foo')), {
		isHelper: true,
		isSource: false,
		isTest: false
	});
	t.deepEqual(helper.classifyFile(path.join(projectDir, 'source.foo')), {
		isHelper: false,
		isSource: true,
		isTest: false
	});
	t.deepEqual(helper.classifyFile(path.join(projectDir, 'tests/test.js')), {
		isHelper: false,
		isSource: false,
		isTest: false
	});
	t.end();
});

test('classifies files according to configuration override', t => {
	const helper = load(overrideDir, {
		extensions: ['foo'],
		files: ['tests/**/*'],
		helpers: ['helpers/*'],
		sources: ['source.*']
	});
	t.deepEqual(helper.classifyFile(path.join(overrideDir, 'tests/test.foo')), {
		isHelper: false,
		isSource: false,
		isTest: true
	});
	t.deepEqual(helper.classifyFile(path.join(overrideDir, 'tests/_helper.foo')), {
		isHelper: true,
		isSource: false,
		isTest: false
	});
	t.deepEqual(helper.classifyFile(path.join(overrideDir, 'helpers/helper.foo')), {
		isHelper: true,
		isSource: false,
		isTest: false
	});
	t.deepEqual(helper.classifyFile(path.join(overrideDir, 'source.foo')), {
		isHelper: false,
		isSource: true,
		isTest: false
	});
	t.deepEqual(helper.classifyFile(path.join(overrideDir, 'tests/test.js')), {
		isHelper: false,
		isSource: false,
		isTest: false
	});
	t.end();
});

test('classifies imports with extension according to the configuration', t => {
	const helper = load(projectDir);
	t.deepEqual(helper.classifyImport(path.join(projectDir, 'tests/test.foo')), {
		isHelper: false,
		isSource: false,
		isTest: true
	});
	t.deepEqual(helper.classifyImport(path.join(projectDir, 'tests/_helper.foo')), {
		isHelper: true,
		isSource: false,
		isTest: false
	});
	t.deepEqual(helper.classifyImport(path.join(projectDir, 'helpers/helper.foo')), {
		isHelper: true,
		isSource: false,
		isTest: false
	});
	t.deepEqual(helper.classifyImport(path.join(projectDir, 'source.foo')), {
		isHelper: false,
		isSource: true,
		isTest: false
	});
	t.end();
});

test('classifies imports with extension according to the override', t => {
	const helper = load(overrideDir, {
		extensions: ['foo'],
		files: ['tests/**/*'],
		helpers: ['helpers/*'],
		sources: ['source.*']
	});
	t.deepEqual(helper.classifyImport(path.join(overrideDir, 'tests/test.foo')), {
		isHelper: false,
		isSource: false,
		isTest: true
	});
	t.deepEqual(helper.classifyImport(path.join(overrideDir, 'tests/_helper.foo')), {
		isHelper: true,
		isSource: false,
		isTest: false
	});
	t.deepEqual(helper.classifyImport(path.join(overrideDir, 'helpers/helper.foo')), {
		isHelper: true,
		isSource: false,
		isTest: false
	});
	t.deepEqual(helper.classifyImport(path.join(overrideDir, 'source.foo')), {
		isHelper: false,
		isSource: true,
		isTest: false
	});
	t.end();
});

test('classifies imports without extension according to the configuration', t => {
	const helper = load(projectDir);
	t.deepEqual(helper.classifyImport(path.join(projectDir, 'tests/test')), {
		isHelper: false,
		isSource: false,
		isTest: true
	});
	t.deepEqual(helper.classifyImport(path.join(projectDir, 'tests/_helper')), {
		isHelper: true,
		isSource: false,
		isTest: false
	});
	t.deepEqual(helper.classifyImport(path.join(projectDir, 'helpers/helper')), {
		isHelper: true,
		isSource: false,
		isTest: false
	});
	t.deepEqual(helper.classifyImport(path.join(projectDir, 'source')), {
		isHelper: false,
		isSource: true,
		isTest: false
	});
	t.end();
});

test('classifies imports without extension according to the override', t => {
	const helper = load(overrideDir, {
		extensions: ['foo'],
		files: ['tests/**/*'],
		helpers: ['helpers/*'],
		sources: ['source.*']
	});
	t.deepEqual(helper.classifyImport(path.join(overrideDir, 'tests/test')), {
		isHelper: false,
		isSource: false,
		isTest: true
	});
	t.deepEqual(helper.classifyImport(path.join(overrideDir, 'tests/_helper')), {
		isHelper: true,
		isSource: false,
		isTest: false
	});
	t.deepEqual(helper.classifyImport(path.join(overrideDir, 'helpers/helper')), {
		isHelper: true,
		isSource: false,
		isTest: false
	});
	t.deepEqual(helper.classifyImport(path.join(overrideDir, 'source')), {
		isHelper: false,
		isSource: true,
		isTest: false
	});
	t.end();
});
