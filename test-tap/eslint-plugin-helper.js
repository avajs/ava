import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {test} from 'tap';

import {load} from '../entrypoints/eslint-plugin-helper.cjs';

const projectDir = fileURLToPath(new URL('fixture/eslint-plugin-helper', import.meta.url));
const overrideDir = fileURLToPath(new URL('fixture/eslint-plugin-helper/for-overriding', import.meta.url));

test('caches loaded configuration', t => {
	const expected = load(projectDir);
	t.equal(expected, load(projectDir));

	const withOverride = load(projectDir, {});
	t.not(expected, withOverride);
	t.equal(withOverride, load(projectDir, {}));

	t.end();
});

test('classifies files according to the configuration', t => {
	const helper = load(projectDir);
	t.same(helper.classifyFile(path.join(projectDir, 'tests/test.foo')), {
		isHelper: false,
		isTest: true,
	});
	t.same(helper.classifyFile(path.join(projectDir, 'tests/_helper.foo')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyFile(path.join(projectDir, 'tests/_helper/file.foo')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyFile(path.join(projectDir, 'helpers/helper.foo')), {
		isHelper: false,
		isTest: false,
	});
	t.same(helper.classifyFile(path.join(projectDir, 'source.foo')), {
		isHelper: false,
		isTest: false,
	});
	t.same(helper.classifyFile(path.join(projectDir, 'tests/test.cjs')), {
		isHelper: false,
		isTest: false,
	});
	t.end();
});

test('classifies files according to configuration override', t => {
	const helper = load(overrideDir, {
		extensions: ['foo'],
		files: ['tests/**/*'],
		helpers: ['helpers/*'],
	});
	t.same(helper.classifyFile(path.join(overrideDir, 'tests/test.foo')), {
		isHelper: false,
		isTest: true,
	});
	t.same(helper.classifyFile(path.join(overrideDir, 'tests/_helper.foo')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyFile(path.join(overrideDir, 'tests/_helper/file.foo')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyFile(path.join(overrideDir, 'helpers/helper.foo')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyFile(path.join(overrideDir, 'source.foo')), {
		isHelper: false,
		isTest: false,
	});
	t.same(helper.classifyFile(path.join(overrideDir, 'tests/test.cjs')), {
		isHelper: false,
		isTest: false,
	});
	t.end();
});

test('classifies imports with extension according to the configuration', t => {
	const helper = load(projectDir);
	t.same(helper.classifyImport(path.join(projectDir, 'tests/test.foo')), {
		isHelper: false,
		isTest: true,
	});
	t.same(helper.classifyImport(path.join(projectDir, 'tests/_helper.foo')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyImport(path.join(projectDir, 'tests/_helper/file.foo')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyImport(path.join(projectDir, 'helpers/helper.foo')), {
		isHelper: false,
		isTest: false,
	});
	t.same(helper.classifyImport(path.join(projectDir, 'source.foo')), {
		isHelper: false,
		isTest: false,
	});
	t.end();
});

test('classifies imports with extension according to the override', t => {
	const helper = load(overrideDir, {
		extensions: ['foo'],
		files: ['tests/**/*'],
		helpers: ['helpers/*'],
	});
	t.same(helper.classifyImport(path.join(overrideDir, 'tests/test.foo')), {
		isHelper: false,
		isTest: true,
	});
	t.same(helper.classifyImport(path.join(overrideDir, 'tests/_helper.foo')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyImport(path.join(overrideDir, 'tests/_helper/file.foo')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyImport(path.join(overrideDir, 'helpers/helper.foo')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyImport(path.join(overrideDir, 'source.foo')), {
		isHelper: false,
		isTest: false,
	});
	t.end();
});

test('classifies imports without extension according to the configuration', t => {
	const helper = load(projectDir);
	t.same(helper.classifyImport(path.join(projectDir, 'tests/test')), {
		isHelper: false,
		isTest: true,
	});
	t.same(helper.classifyImport(path.join(projectDir, 'tests/_helper')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyImport(path.join(projectDir, 'tests/_helper/file')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyImport(path.join(projectDir, 'helpers/helper')), {
		isHelper: false,
		isTest: false,
	});
	t.same(helper.classifyImport(path.join(projectDir, 'source')), {
		isHelper: false,
		isTest: false,
	});
	t.end();
});

test('classifies imports without extension according to the override', t => {
	const helper = load(overrideDir, {
		extensions: ['foo'],
		files: ['tests/**/*'],
		helpers: ['helpers/*'],
	});
	t.same(helper.classifyImport(path.join(overrideDir, 'tests/test')), {
		isHelper: false,
		isTest: true,
	});
	t.same(helper.classifyImport(path.join(overrideDir, 'tests/_helper')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyImport(path.join(overrideDir, 'tests/_helper/file')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyImport(path.join(overrideDir, 'helpers/helper')), {
		isHelper: true,
		isTest: false,
	});
	t.same(helper.classifyImport(path.join(overrideDir, 'source')), {
		isHelper: false,
		isTest: false,
	});
	t.end();
});
