'use strict';
var path = require('path');
var tap = require('tap');
var AvaFiles = require('../lib/ava-files');

var test = tap.test;

tap.afterEach(function (done) {
	// We changed the CWD in some of the tests.
	process.chdir(path.join(__dirname, '..'));
	done();
});

function fixture() {
	var args = Array.prototype.slice.call(arguments);
	args.unshift(__dirname, 'fixture', 'ava-files');
	return path.join.apply(path, args);
}

test('requires new', function (t) {
	var avaFiles = AvaFiles;
	t.throws(function () {
		avaFiles(['**/foo*']);
	}, 'Class constructor AvaFiles cannot be invoked without \'new\'');
	t.end();
});

test('testMatcher', function (t) {
	var avaFiles = new AvaFiles(['**/foo*']);

	var matcher = avaFiles.makeTestMatcher();

	function isTest(file) {
		t.true(matcher(file), file + ' should be a test');
	}

	function notTest(file) {
		t.false(matcher(file), file + ' should not be a test');
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

test('sourceMatcher - defaults', function (t) {
	var avaFiles = new AvaFiles(['**/foo*']);

	var matcher = avaFiles.makeSourceMatcher();

	function isSource(file) {
		t.true(matcher(file), file + ' should be a source');
	}

	function notSource(file) {
		t.false(matcher(file), file + ' should not be a source');
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

test('sourceMatcher - allow matching specific node_modules directories', function (t) {
	var avaFiles = new AvaFiles(['**/foo*'], ['node_modules/foo/**']);

	var matcher = avaFiles.makeSourceMatcher();

	t.true(matcher('node_modules/foo/foo.js'));
	t.false(matcher('node_modules/bar/foo.js'));
	t.end();
});

test('sourceMatcher - providing negation patterns', function (t) {
	var avaFiles = new AvaFiles(['**/foo*'], ['!**/bar*']);

	var matcher = avaFiles.makeSourceMatcher();

	t.false(matcher('node_modules/foo/foo.js'));
	t.false(matcher('bar.js'));
	t.false(matcher('foo/bar.js'));
	t.end();
});

test('findFiles - does not return duplicates of the same file', function (t) {
	var avaFiles = new AvaFiles(['**/ava-files/no-duplicates/**']);

	avaFiles.findTestFiles().then(function (files) {
		t.is(files.length, 2);
		t.end();
	});
});

test('findFiles - finds the correct files by default', function (t) {
	var fixtureDir = fixture('default-patterns');
	process.chdir(fixtureDir);

	var expected = [
		'sub/directory/__tests__/foo.js',
		'sub/directory/bar.test.js',
		'test-foo.js',
		'test.js',
		'test/baz.js',
		'test/deep/deep.js'
	].map(function (file) {
		return path.join(fixtureDir, file);
	}).sort();

	var avaFiles = new AvaFiles();
	avaFiles.findTestFiles().then(function (files) {
		files.sort();
		t.deepEqual(files, expected);
		t.end();
	});
});
