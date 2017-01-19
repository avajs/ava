'use strict';
const path = require('path');
const tap = require('tap');
const AvaFiles = require('../lib/ava-files');

const test = tap.test;

tap.afterEach(done => {
	// We changed the CWD in some of the tests
	process.chdir(path.resolve(__dirname, '..'));
	done();
});

function fixture() {
	const args = Array.prototype.slice.call(arguments);
	args.unshift(__dirname, 'fixture', 'ava-files');
	return path.join.apply(path, args);
}

test('ignores relativeness in patterns', t => {
	const avaFiles = new AvaFiles({files: ['./foo']});
	const file = avaFiles.files[0];

	t.is(file, 'foo');
	t.end();
});

test('testMatcher', t => {
	const avaFiles = new AvaFiles({files: ['**/foo*']});

	function isTest(file) {
		t.true(avaFiles.isTest(file), `${file} should be a test`);
	}

	function notTest(file) {
		t.false(avaFiles.isTest(file), `${file} should not be a test`);
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

test('sourceMatcher - defaults', t => {
	const avaFiles = new AvaFiles({files: ['**/foo*']});

	function isSource(file) {
		t.true(avaFiles.isSource(file), `${file} should be a source`);
	}

	function notSource(file) {
		t.false(avaFiles.isSource(file), `${file} should not be a source`);
	}

	isSource('foo-bar.js');
	isSource('foo.js');
	isSource('foo/blah.js');
	isSource('bar/foo.js');

	isSource('_foo-bar.js');
	isSource('foo/_foo-bar.js');
	isSource('fixtures/foo.js');
	isSource('helpers/foo.js');

	// TODO: Watcher should probably track any required file that matches the source pattern and has a require extension installed for the given extension.
	notSource('foo-bar.json');
	notSource('foo-bar.coffee');

	// These seem OK
	isSource('bar.js');
	isSource('bar/bar.js');
	notSource('node_modules/foo.js');
	t.end();
});

test('sourceMatcher - allow matching specific node_modules directories', t => {
	const avaFiles = new AvaFiles({
		files: ['**/foo*'],
		sources: ['node_modules/foo/**']
	});

	t.true(avaFiles.isSource('node_modules/foo/foo.js'));
	t.false(avaFiles.isSource('node_modules/bar/foo.js'));
	t.end();
});

test('sourceMatcher - providing negation patterns', t => {
	const avaFiles = new AvaFiles({
		files: ['**/foo*'],
		sources: ['!**/bar*']
	});

	t.false(avaFiles.isSource('node_modules/foo/foo.js'));
	t.false(avaFiles.isSource('bar.js'));
	t.false(avaFiles.isSource('foo/bar.js'));
	t.end();
});

test('findFiles - does not return duplicates of the same file', t => {
	const avaFiles = new AvaFiles({files: ['**/ava-files/no-duplicates/**']});

	avaFiles.findTestFiles().then(files => {
		t.is(files.length, 2);
		t.end();
	});
});

test('findFiles - honors cwd option', t => {
	const avaFiles = new AvaFiles({
		files: ['**/test/*.js'],
		cwd: fixture('cwd', 'dir-b')
	});

	avaFiles.findTestFiles().then(files => {
		t.is(files.length, 1);
		t.is(path.basename(files[0]), 'baz.js');
		t.end();
	});
});

test('findFiles - finds the correct files by default', t => {
	const fixtureDir = fixture('default-patterns');
	process.chdir(fixtureDir);

	const expected = [
		'sub/directory/__tests__/foo.js',
		'sub/directory/bar.test.js',
		'test-foo.js',
		'test.js',
		'test/baz.js',
		'test/deep/deep.js'
	].map(file => path.join(fixtureDir, file)).sort();

	const avaFiles = new AvaFiles();

	avaFiles.findTestFiles().then(files => {
		files.sort();
		t.deepEqual(files, expected);
		t.end();
	});
});

test('findTestHelpers - finds the test helpers', t => {
	const fixtureDir = fixture('default-patterns');
	process.chdir(fixtureDir);

	const expected = [
		'sub/directory/__tests__/helpers/foo.js',
		'sub/directory/__tests__/_foo.js',
		'test/helpers/test.js',
		'test/_foo-help.js'
	].sort().map(file => path.join(fixtureDir, file));

	const avaFiles = new AvaFiles();

	avaFiles.findTestHelpers().then(files => {
		t.deepEqual(files.sort(), expected);
		t.end();
	});
});
