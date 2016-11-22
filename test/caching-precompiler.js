'use strict';
const fs = require('fs');
const path = require('path');
const test = require('tap').test;
const uniqueTempDir = require('unique-temp-dir');
const sinon = require('sinon');
const babel = require('babel-core');
const fromMapFileSource = require('convert-source-map').fromMapFileSource;
const CachingPrecompiler = require('../lib/caching-precompiler');

const fixture = name => path.join(__dirname, 'fixture', name);
const endsWithJs = filename => /\.js$/.test(filename);
const endsWithMap = filename => /\.js\.map$/.test(filename);

sinon.spy(babel, 'transform');

test('creation with new', t => {
	const tempDir = uniqueTempDir();
	const precompiler = new CachingPrecompiler({path: tempDir});
	t.is(precompiler.cacheDirPath, tempDir);
	t.end();
});

test('must be called with new', t => {
	t.throws(() => {
		const cachingPrecompiler = CachingPrecompiler;
		cachingPrecompiler({path: uniqueTempDir()});
	}, {message: 'Class constructor CachingPrecompiler cannot be invoked without \'new\''});
	t.end();
});

test('adds files and source maps to the cache directory as needed', t => {
	const tempDir = uniqueTempDir();
	const precompiler = new CachingPrecompiler({path: tempDir});

	t.false(fs.existsSync(tempDir), 'cache directory is not created before it is needed');

	precompiler.precompileFile(fixture('es2015.js'));
	t.true(fs.existsSync(tempDir), 'cache directory is lazily created');

	const files = fs.readdirSync(tempDir);
	t.is(files.length, 2);
	t.is(files.filter(endsWithJs).length, 1, 'one .js file is saved to the cache');
	t.is(files.filter(endsWithMap).length, 1, 'one .js.map file is saved to the cache');
	t.end();
});

test('adds a map file comment to the cached files', t => {
	const tempDir = uniqueTempDir();
	const precompiler = new CachingPrecompiler({path: tempDir});

	precompiler.precompileFile(fixture('es2015.js'));

	let cachedCode;
	let cachedMap;
	fs.readdirSync(tempDir).map(file => path.join(tempDir, file)).forEach(file => {
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
	const foundMap = fromMapFileSource(cachedCode, path.join(__dirname, 'fixture'));
	t.ok(foundMap);
	t.is(foundMap.toJSON(), cachedMap);
	t.end();
});

test('uses default babel options when babelConfig === "default"', t => {
	const tempDir = uniqueTempDir();
	const precompiler = new CachingPrecompiler({
		path: tempDir,
		babel: 'default'
	});

	babel.transform.reset();

	precompiler.precompileFile(fixture('es2015.js'));

	t.true(babel.transform.calledOnce);
	const options = babel.transform.firstCall.args[1];

	t.true('filename' in options);
	t.true(options.sourceMaps);
	t.false(options.ast);
	t.true('inputSourceMap' in options);
	t.false(options.babelrc);
	t.true(Array.isArray(options.presets));
	t.true(Array.isArray(options.plugins));
	t.end();
});

test('allows babel config from package.json/babel when babelConfig === "inherit"', t => {
	const tempDir = uniqueTempDir();
	const precompiler = new CachingPrecompiler({
		path: tempDir,
		babel: 'inherit'
	});

	babel.transform.reset();

	precompiler.precompileFile(fixture('es2015.js'));

	t.true(babel.transform.calledOnce);
	const options = babel.transform.firstCall.args[1];

	t.true('filename' in options);
	t.true(options.sourceMaps);
	t.false(options.ast);
	t.true('inputSourceMap' in options);
	t.true(options.babelrc);
	t.end();
});

test('does not modify plugins array in babelConfig', t => {
	const plugins = [];
	const precompiler = new CachingPrecompiler({
		path: uniqueTempDir(),
		plugins
	});

	precompiler.precompileFile(fixture('es2015.js'));
	t.strictDeepEqual(plugins, []);
	t.end();
});
