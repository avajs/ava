'use strict';
var fs = require('fs');
var path = require('path');
var test = require('tap').test;
var uniqueTempDir = require('unique-temp-dir');
var sinon = require('sinon');
var babel = require('babel-core');
var transformRuntime = require('babel-plugin-transform-runtime');
var throwsHelper = require('babel-plugin-ava-throws-helper');
var fromMapFileSource = require('convert-source-map').fromMapFileSource;

var CachingPrecompiler = require('../lib/caching-precompiler');

function fixture(name) {
	return path.join(__dirname, 'fixture', name);
}

function endsWithJs(filename) {
	return /\.js$/.test(filename);
}

function endsWithMap(filename) {
	return /\.js\.map$/.test(filename);
}

sinon.spy(babel, 'transform');

test('creation with new', function (t) {
	var tempDir = uniqueTempDir();
	var precompiler = new CachingPrecompiler(tempDir, null);
	t.is(precompiler.cacheDirPath, tempDir);
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
	t.is(files.filter(endsWithMap).length, 1, 'one .js.map file is saved to the cache');
	t.end();
});

test('adds a map file comment to the cached files', function (t) {
	var tempDir = uniqueTempDir();
	var precompiler = new CachingPrecompiler(tempDir, null);

	precompiler.precompileFile(fixture('es2015.js'));

	var cachedCode;
	var cachedMap;
	fs.readdirSync(tempDir).map(function (file) {
		return path.join(tempDir, file);
	}).forEach(function (file) {
		if (endsWithJs(file)) {
			cachedCode = fs.readFileSync(file, 'utf8');
		} else if (endsWithMap(file)) {
			cachedMap = fs.readFileSync(file, 'utf8');
		}
	});

	// This is comparable to how nyc resolves the source map. It has access to the
	// cached code but believes it to come from the original es2015.js fixture.
	// Ensure the cached map can be resolved from the cached code. Also see
	// <https://github.com/bcoe/nyc/blob/69ed03b29c423c0fd7bd41f9dc8e7a3a68f7fe50/index.js#L244>.
	var foundMap = fromMapFileSource(cachedCode, path.join(__dirname, 'fixture'));
	t.ok(foundMap);
	t.is(foundMap.toJSON(), cachedMap);
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
	var customPlugin = sinon.stub().returns({visitor: {}});
	var powerAssert = sinon.stub().returns({visitor: {}});
	var rewrite = sinon.stub().returns({visitor: {}});
	var precompiler = new CachingPrecompiler(tempDir, {
		presets: ['stage-2', 'es2015'],
		plugins: [customPlugin]
	});
	sinon.stub(precompiler, '_createEspowerPlugin').returns(powerAssert);
	sinon.stub(precompiler, '_createRewritePlugin').returns(rewrite);
	babel.transform.reset();

	precompiler.precompileFile(fixture('es2015.js'));

	t.true(babel.transform.calledOnce);
	var options = babel.transform.firstCall.args[1];

	t.true('filename' in options);
	t.true(options.sourceMaps);
	t.false(options.ast);
	t.true('inputSourceMap' in options);
	t.false(options.babelrc);
	t.strictDeepEqual(options.presets, ['stage-2', 'es2015']);
	t.strictDeepEqual(options.plugins, [customPlugin, powerAssert, throwsHelper, rewrite, transformRuntime]);
	t.end();
});

test('does not modify plugins array in babelConfig', function (t) {
	var plugins = [];
	var precompiler = new CachingPrecompiler(uniqueTempDir(), {
		plugins: plugins
	});

	precompiler.precompileFile(fixture('es2015.js'));
	t.strictDeepEqual(plugins, []);
	t.end();
});
