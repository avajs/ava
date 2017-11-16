'use strict';
const fs = require('fs');
const path = require('path');
const test = require('tap').test;
const uniqueTempDir = require('unique-temp-dir');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const babel = require('babel-core');
const fromMapFileSource = require('convert-source-map').fromMapFileSource;
const CachingPrecompiler = require('../lib/caching-precompiler');

const fixture = name => path.join(__dirname, 'fixture', name);
const endsWithJs = filename => /\.js$/.test(filename);
const endsWithMap = filename => /\.js\.map$/.test(filename);

function getBabelOptions() {
	return {
		babelrc: false
	};
}

const babelCacheKeys = {};

sinon.spy(babel, 'transform');

test('creation with new', t => {
	const tempDir = uniqueTempDir();
	const precompiler = new CachingPrecompiler({path: tempDir, getBabelOptions, babelCacheKeys});
	t.is(precompiler.cacheDirPath, tempDir);
	t.end();
});

test('adds files and source maps to the cache directory as needed', t => {
	const tempDir = uniqueTempDir();
	const precompiler = new CachingPrecompiler({path: tempDir, getBabelOptions, babelCacheKeys});

	t.false(fs.existsSync(tempDir), 'cache directory is not created before it is needed');

	precompiler.precompileFile(fixture('es2015.js'));
	t.true(fs.existsSync(tempDir), 'cache directory is lazily created');

	const files = fs.readdirSync(tempDir);
	t.is(files.length, 2);
	t.is(files.filter(x => endsWithJs(x)).length, 1, 'one .js file is saved to the cache');
	t.is(files.filter(x => endsWithMap(x)).length, 1, 'one .js.map file is saved to the cache');
	t.end();
});

test('adds a map file comment to the cached files', t => {
	const tempDir = uniqueTempDir();
	const precompiler = new CachingPrecompiler({path: tempDir, getBabelOptions, babelCacheKeys});

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

test('should reuse existing source maps', t => {
	const tempDir = uniqueTempDir();
	const precompiler = new CachingPrecompiler({path: tempDir, getBabelOptions, babelCacheKeys});

	precompiler.precompileFile(fixture('es2015-source-maps.js'));
	const options = babel.transform.lastCall.args[1];
	t.ok(options.inputSourceMap);
	t.end();
});

test('disables babel cache', t => {
	t.plan(2);

	const tempDir = uniqueTempDir();
	const CachingPrecompiler = proxyquire('../lib/caching-precompiler', {
		'babel-core': Object.assign({}, babel, {
			transform(code, options) {
				t.same(process.env.BABEL_DISABLE_CACHE, '1');
				return babel.transform(code, options);
			}
		})
	});
	const precompiler = new CachingPrecompiler({path: tempDir, getBabelOptions, babelCacheKeys});

	process.env.BABEL_DISABLE_CACHE = 'foo';
	precompiler.precompileFile(fixture('es2015.js'));
	t.same(process.env.BABEL_DISABLE_CACHE, 'foo');
	t.end();
});
