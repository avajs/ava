'use strict';
var fs = require('fs');
var path = require('path');
var test = require('tap').test;
var uniqueTempDir = require('unique-temp-dir');
var sinon = require('sinon');
var babel = require('babel-core');

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

test('before', function (t) {
	sinon.spy(babel, 'transform');
	t.end();
});

test('creation with new', function (t) {
	var tempDir = uniqueTempDir();
	var precompiler = new CachingPrecompiler(tempDir, null);
	t.is(precompiler.cacheDir, tempDir);
	t.end();
});

test('must be called with new', function (t) {
	t.throws(function () {
		var cachingPrecompiler = CachingPrecompiler;
		cachingPrecompiler(uniqueTempDir(), null);
	}, {message: 'Class constructor CachingPrecompiler cannot be invoked without \'new\''});
	t.end();
});

test('adds files and source maps to the cache directory as needed', function (t) {
	var tempDir = uniqueTempDir();
	var precompiler = new CachingPrecompiler(tempDir, null);

	t.false(fs.existsSync(tempDir), 'cache directory is not created before it is needed');

	precompiler.precompileFile(fixture('es2015.js'));
	t.true(fs.existsSync(tempDir), 'cache directory is lazily created');

	var files = fs.readdirSync(tempDir);
	t.is(files.length, 2);
	t.is(files.filter(endsWithJs).length, 1, 'one .js file is saved to the cache');
	t.is(files.filter(endsWithMap).length, 1, 'one .map file is saved to the cache');
	t.end();
});

test('uses default babel options when !babelConfig', function (t) {
	var tempDir = uniqueTempDir();
	var precompiler = new CachingPrecompiler(tempDir, null);
	babel.transform.reset();

	precompiler.precompileFile(fixture('es2015.js'));

	t.true(babel.transform.calledOnce);
	var options = babel.transform.firstCall.args[1];

	t.true('filename' in options);
	t.true(options.sourceMaps);
	t.false(options.ast);
	t.true('inputSourceMap' in options);
	t.false(options.babelrc);
	t.true(Array.isArray(options.presets));
	t.true(Array.isArray(options.plugins));
	t.end();
});

test('uses default babel options when babelConfig === "default"', function (t) {
	var tempDir = uniqueTempDir();
	var precompiler = new CachingPrecompiler(tempDir, 'default');
	babel.transform.reset();

	precompiler.precompileFile(fixture('es2015.js'));

	t.true(babel.transform.calledOnce);
	var options = babel.transform.firstCall.args[1];

	t.true('filename' in options);
	t.true(options.sourceMaps);
	t.false(options.ast);
	t.true('inputSourceMap' in options);
	t.false(options.babelrc);
	t.true(Array.isArray(options.presets));
	t.true(Array.isArray(options.plugins));
	t.end();
});

test('allows babel config from package.json/babel when babelConfig === "inherit"', function (t) {
	var tempDir = uniqueTempDir();
	var precompiler = new CachingPrecompiler(tempDir, 'inherit');
	babel.transform.reset();

	precompiler.precompileFile(fixture('es2015.js'));

	t.true(babel.transform.calledOnce);
	var options = babel.transform.firstCall.args[1];

	t.true('filename' in options);
	t.true(options.sourceMaps);
	t.false(options.ast);
	t.true('inputSourceMap' in options);
	t.true(options.babelrc);
	t.end();
});

test('uses babelConfig for babel options when babelConfig is an object', function (t) {
	var tempDir = uniqueTempDir();
	var precompiler = new CachingPrecompiler(tempDir, {
		presets: ['stage-2', 'es2015'],
		plugins: []
	});
	babel.transform.reset();

	precompiler.precompileFile(fixture('es2015.js'));

	t.true(babel.transform.calledOnce);
	var options = babel.transform.firstCall.args[1];

	t.true('filename' in options);
	t.true(options.sourceMaps);
	t.false(options.ast);
	t.true('inputSourceMap' in options);
	t.false(options.babelrc);
	t.deepEqual(options.presets, ['stage-2', 'es2015']);
	t.deepEqual(options.plugins, []);
	t.end();
});

test('after', function (t) {
	babel.transform.restore();
	t.end();
});
