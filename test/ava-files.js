'use strict';
var test = require('tap').test;
var AvaFiles = require('../lib/ava-files');

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

	// TODO: Should these actually not be considered sources since they would match as a test?
	isSource('foo-bar.js');
	isSource('foo.js');
	isSource('foo/blah.js');
	isSource('bar/foo.js');

	// TODO: Same as above - shouldn't these be "not sources" - they are test fixtures and helpers
	isSource('_foo-bar.js');
	isSource('foo/_foo-bar.js');
	isSource('fixtures/foo.js');
	isSource('helpers/foo.js');

	// TODO: What if a non `.js` file is read with `fs.readFileXXX` and has an impact on behavior? Shouldn't changing it trigger a re-run? (Obviously can't take advantage of smart watcher behavior).
	notSource('foo-bar.json');

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
