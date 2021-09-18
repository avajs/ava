import path from 'node:path';
import {fileURLToPath} from 'node:url';

import tap from 'tap';

import * as globs from '../lib/globs.js';

const {test} = tap;

const __dirname = fileURLToPath(new URL('.', import.meta.url));

tap.afterEach(() => {
	// We changed the CWD in some of the tests
	process.chdir(path.resolve(__dirname, '..'));
});

function fixture(...args) {
	args.unshift(__dirname, 'fixture', 'globs');
	return path.join(...args);
}

test('ignores relativeness in patterns', t => {
	const {filePatterns} = globs.normalizeGlobs({files: ['./foo.js', '!./bar'], extensions: ['js'], providers: []});
	t.same(filePatterns, ['foo.js', '!bar']);
	t.end();
});

test('ignores trailing slashes in (simple) patterns', t => {
	const {filePatterns} = globs.normalizeGlobs({files: ['foo/', '!bar/', 'foo/{bar/,baz/}'], extensions: ['js'], providers: []});
	t.same(filePatterns, ['foo', '!bar', 'foo/{bar/,baz/}']);
	t.end();
});

test('isTest with defaults', t => {
	const options = {
		...globs.normalizeGlobs({
			extensions: ['js'],
			providers: [],
		}),
		cwd: fixture(),
	};

	function isTest(file) {
		t.ok(globs.classify(fixture(file), options).isTest, `${file} should be a test`);
	}

	function notTest(file) {
		t.notOk(globs.classify(fixture(file), options).isTest, `${file} should not be a test`);
	}

	isTest('__tests__/foo.js');
	isTest('__tests__/foo/bar.js');
	isTest('foo.spec.js');
	isTest('foo.test.js');
	isTest('test-foo.js');
	isTest('test.js');
	notTest('foo/test.js');
	isTest('test/foo.js');
	isTest('tests/foo.js');
	notTest('foo-bar.js');
	notTest('foo.js');
	notTest('foo/blah.js');
	notTest('bar/foo.js');
	notTest('bar/foo-bar/baz/buz.js');
	notTest('bar/baz/buz.js');
	notTest('bar.js');
	notTest('bar/bar.js');
	notTest('_foo-bar.js');
	notTest('foo/_foo-bar.js');
	notTest('foo-bar.txt');
	notTest('node_modules/foo.js');
	notTest('fixtures/foo.js');
	notTest('helpers/foo.js');
	notTest('_foo/bar.js');
	notTest('__tests__/__helper__/foo.js');
	notTest('__tests__/__helper__/test.js');
	notTest('__tests__/__helpers__/foo.js');
	notTest('__tests__/__helpers__/test.js');
	notTest('__tests__/__fixture__/foo.js');
	notTest('__tests__/__fixture__/test.js');
	notTest('__tests__/__fixtures__/foo.js');
	notTest('__tests__/__fixtures__/test.js');
	isTest('__tests__/helper/foo.js');
	isTest('__tests__/fixtures/foo.js');
	isTest('test/foo.js');
	notTest('test/_foo/bar.js');
	notTest('test/helper/foo.js');
	notTest('test/helper/test.js');
	notTest('test/helpers/foo.js');
	notTest('test/helpers/test.js');
	notTest('test/fixture/foo.js');
	notTest('test/fixture/test.js');
	notTest('test/fixtures/foo.js');
	notTest('test/fixtures/test.js');
	notTest('tests/helper/foo.js');
	notTest('tests/helper/test.js');
	notTest('tests/helpers/foo.js');
	notTest('tests/helpers/test.js');
	notTest('tests/fixture/foo.js');
	notTest('tests/fixture/test.js');
	notTest('tests/fixtures/foo.js');
	notTest('tests/fixtures/test.js');
	isTest('tests/__helper__/test.js');
	isTest('tests/__fixtures__/test.js');
	t.end();
});

test('isTest with patterns', t => {
	const options = {
		...globs.normalizeGlobs({
			files: ['**/foo*.js', '**/foo*/**/*.js', '!**/fixtures', '!**/helpers'],
			extensions: ['js'],
			providers: [],
		}),
		cwd: fixture(),
	};

	function isTest(file) {
		t.ok(globs.classify(fixture(file), options).isTest, `${file} should be a test`);
	}

	function notTest(file) {
		t.notOk(globs.classify(fixture(file), options).isTest, `${file} should not be a test`);
	}

	isTest('foo-bar.js');
	isTest('foo.js');
	isTest('foo/blah.js');
	isTest('bar/foo.js');
	isTest('bar/foo-bar/baz/buz.js');
	notTest('bar/baz/buz.js');
	notTest('bar.js');
	notTest('bar/bar.js');
	notTest('_foo-bar.js');
	notTest('foo/_foo-bar.js');
	notTest('foo-bar.txt');
	notTest('node_modules/foo.js');
	notTest('fixtures/foo.js');
	notTest('helpers/foo.js');
	t.end();
});

test('isTest (pattern starts with directory)', t => {
	const options = {
		...globs.normalizeGlobs({
			files: ['bar/**/*'],
			extensions: ['js'],
			providers: [],
		}),
		cwd: fixture(),
	};

	function isTest(file) {
		t.ok(globs.classify(fixture(file), options).isTest, `${file} should be a test`);
	}

	function notTest(file) {
		t.notOk(globs.classify(fixture(file), options).isTest, `${file} should not be a test`);
	}

	notTest('foo-bar.js');
	notTest('foo.js');
	notTest('foo/blah.js');
	isTest('bar/foo.js');
	isTest('bar/foo-bar/baz/buz.js');
	isTest('bar/baz/buz.js');
	notTest('bar.js');
	isTest('bar/bar.js');
	notTest('bar/_foo-bar.js');
	notTest('foo/_foo-bar.js');
	notTest('foo-bar.txt');
	notTest('node_modules/foo.js');
	notTest('fixtures/foo.js');
	notTest('helpers/foo.js');
	t.end();
});

test('isTest after provider modifications', t => {
	const options = {
		...globs.normalizeGlobs({
			extensions: ['js'],
			providers: [{
				level: 2,
				main: {
					updateGlobs({filePatterns, ignoredByWatcherPatterns}) {
						t.ok(filePatterns.length > 0);
						t.ok(ignoredByWatcherPatterns.length > 0);
						return {
							filePatterns: ['foo.js'],
							ignoredByWatcherPatterns,
						};
					},
				},
			}],
		}),
		cwd: fixture(),
	};

	t.ok(globs.classify(fixture('foo.js'), options).isTest);
	t.notOk(globs.classify(fixture('bar.js'), options).isTest);
	t.end();
});

test('isIgnoredByWatcher with defaults', t => {
	const options = {
		...globs.normalizeGlobs({extensions: ['js'], providers: []}),
		cwd: fixture(),
	};

	function isIgnoredByWatcher(file) {
		t.ok(globs.classify(fixture(file), options).isIgnoredByWatcher, `${file} should be ignored`);
	}

	function notIgnored(file) {
		t.notOk(globs.classify(fixture(file), options).isIgnoredByWatcher, `${file} should not be ignored`);
	}

	notIgnored('foo-bar.js');
	notIgnored('foo.js');
	notIgnored('foo/blah.js');
	notIgnored('bar/foo.js');

	notIgnored('_foo-bar.js');
	notIgnored('foo/_foo-bar.js');
	notIgnored('fixtures/foo.js');
	notIgnored('helpers/foo.js');

	notIgnored('snapshots/foo.js.snap');
	isIgnoredByWatcher('snapshots/foo.js.snap.md');
	notIgnored('foo-bar.json');
	notIgnored('foo-bar.coffee');

	notIgnored('bar.js');
	notIgnored('bar/bar.js');
	isIgnoredByWatcher('node_modules/foo.js');
	t.end();
});

test('isIgnoredByWatcher with patterns', t => {
	const options = {
		...globs.normalizeGlobs({
			files: ['**/foo*'],
			ignoredByWatcher: ['**/bar*'],
			extensions: ['js'],
			providers: [],
		}),
		cwd: fixture(),
	};

	t.ok(globs.classify(fixture('node_modules/foo/foo.js'), options).isIgnoredByWatcher);
	t.ok(globs.classify(fixture('bar.js'), options).isIgnoredByWatcher);
	t.ok(globs.classify(fixture('foo/bar.js'), options).isIgnoredByWatcher);
	t.end();
});

test('isIgnoredByWatcher (pattern starts with directory)', t => {
	const options = {
		...globs.normalizeGlobs({
			files: ['**/foo*'],
			ignoredByWatcher: ['foo/**/*'],
			extensions: ['js'],
			providers: [],
		}),
		cwd: fixture(),
	};

	t.ok(globs.classify(fixture('node_modules/foo/foo.js'), options).isIgnoredByWatcher);
	t.notOk(globs.classify(fixture('bar.js'), options).isIgnoredByWatcher);
	t.ok(globs.classify(fixture('foo/bar.js'), options).isIgnoredByWatcher);
	t.end();
});

test('isIgnoredByWatcher after provider modifications', t => {
	const options = {
		...globs.normalizeGlobs({
			extensions: ['js'],
			providers: [{
				level: 2,
				main: {
					updateGlobs({filePatterns, ignoredByWatcherPatterns}) {
						t.ok(filePatterns.length > 0);
						t.ok(ignoredByWatcherPatterns.length > 0);
						return {
							filePatterns,
							ignoredByWatcherPatterns: ['foo.js'],
						};
					},
				},
			}],
		}),
		cwd: fixture(),
	};

	t.ok(globs.classify(fixture('foo.js'), options).isIgnoredByWatcher);
	t.notOk(globs.classify(fixture('bar.js'), options).isIgnoredByWatcher);
	t.end();
});

test('findFiles finds non-ignored files (just .cjs)', async t => {
	const fixtureDir = fixture('default-patterns');
	process.chdir(fixtureDir);

	const expected = [
		'sub/directory/__tests__/_foo.cjs',
		'sub/directory/__tests__/foo.cjs',
		'sub/directory/bar.spec.cjs',
		'sub/directory/bar.test.cjs',
		'test-foo.cjs',
		'test.cjs',
		'test/_foo-help.cjs',
		'test/baz.cjs',
		'test/deep/deep.cjs',
		'tests/baz.cjs',
		'tests/deep/deep.cjs',
		'tests/_foo-help.cjs',
	].map(file => path.join(fixtureDir, file)).sort();

	const actual = await globs.findFiles({
		cwd: fixtureDir,
		...globs.normalizeGlobs({files: ['!**/fixtures/*.*', '!**/helpers/*.*'], extensions: ['cjs'], providers: []}),
	});
	actual.sort();
	t.same(actual, expected);
});

test('findFiles finds non-ignored files (.cjs, .jsx)', async t => {
	const fixtureDir = fixture('custom-extension');
	process.chdir(fixtureDir);

	const expected = [
		'test/do-not-compile.cjs',
		'test/foo.jsx',
		'test/sub/_helper.jsx',
		'test/sub/bar.jsx',
	].sort().map(file => path.join(fixtureDir, file));

	const actual = await globs.findFiles({
		cwd: fixtureDir,
		...globs.normalizeGlobs({files: ['!**/fixtures/*', '!**/helpers/*'], extensions: ['cjs', 'jsx'], providers: []}),
	});
	actual.sort();
	t.same(actual, expected);
});
