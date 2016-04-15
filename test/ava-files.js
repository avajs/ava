'use strict';
var test = require('tap').test;
var AvaFiles = require('../lib/ava-files');

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

test('sourceMatcher', function (t) {
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
