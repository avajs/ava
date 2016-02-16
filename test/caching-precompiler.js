'use strict';
var fs = require('fs');
var path = require('path');
var test = require('tap').test;
var uniqueTempDir = require('unique-temp-dir');

var CachingPrecompiler = require('../lib/caching-precompiler');

function fixture(name) {
	return path.join(__dirname, 'fixture', name);
}

function endsWithJs(filename) {
	return /\.js$/.test(filename);
}

function endsWithMap(filename) {
	return /\.js$/.test(filename);
}

test('creation with new', function (t) {
	var tempDir = uniqueTempDir();
	var precompiler = new CachingPrecompiler(tempDir);
	t.is(precompiler.cacheDir, tempDir);
	t.end();
});

test('must be called with new', function (t) {
	t.throws(function () {
		var cachingPrecompiler = CachingPrecompiler;
		cachingPrecompiler(uniqueTempDir());
	}, {message: 'Class constructor CachingPrecompiler cannot be invoked without \'new\''});
	t.end();
});

test('adds files and source maps to the cache directory as needed', function (t) {
	var tempDir = uniqueTempDir();
	var precompiler = new CachingPrecompiler(tempDir);

	t.false(fs.existsSync(tempDir), 'cache directory is not created before it is needed');

	precompiler.precompileFile(fixture('es2015.js'));
	t.true(fs.existsSync(tempDir), 'cache directory is lazily created');

	var files = fs.readdirSync(tempDir);
	t.is(files.length, 2);
	t.is(files.filter(endsWithJs).length, 1, 'one .js file is saved to the cache');
	t.is(files.filter(endsWithMap).length, 1, 'one .map file is saved to the cache');
	t.end();
});
