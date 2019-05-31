'use strict';
const path = require('path');
const {test} = require('tap');

const {load} = require('../eslint-plugin-helper');

const projectDir = path.join(__dirname, 'fixture/eslint-plugin-helper');

test('caches loaded configuration', t => {
	const expected = load(projectDir);
	const actual = load(projectDir);
	t.is(expected, actual);
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
