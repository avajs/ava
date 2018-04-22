'use strict';
require('../lib/chalk').set();

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('tap').test;
const makeDir = require('make-dir');
const uniqueTempDir = require('unique-temp-dir');

const babelConfigHelper = require('../lib/babel-config');

const fixture = name => path.join(__dirname, 'fixture', name);
const NUM_SYNTAX_PLUGINS = 2;

function withNodeEnv(value, run) {
	assert(!('NODE_ENV' in process.env));
	process.env.NODE_ENV = value;
	const reset = () => {
		delete process.env.NODE_ENV;
	};
	const promise = new Promise(resolve => {
		resolve(run());
	});
	promise.then(reset, reset);
	return promise;
}

test('includes testOptions in Babel compilation', t => {
	const customFile = require.resolve(fixture('babel-noop-plugin-or-preset'));
	const custom = require(fixture('babel-noop-plugin-or-preset'));
	const testOptions = {
		plugins: [customFile],
		presets: [customFile]
	};
	const compileEnhancements = true;

	const projectDir = fixture('no-babel-config');
	const cacheDir = path.join(uniqueTempDir(), 'cache');
	return babelConfigHelper.build(projectDir, cacheDir, {testOptions}, compileEnhancements)
		.then(result => {
			const options = result.getOptions();
			t.false(options.babelrc);
			t.is(options.plugins[NUM_SYNTAX_PLUGINS][0].wrapped, custom);
			t.is(options.presets[0][0].wrapped, require('@ava/babel-preset-stage-4'));
			t.is(options.presets[1][0].wrapped, custom);
			t.is(options.presets[2][0].wrapped, require('@ava/babel-preset-transform-test-files'));
			t.same(options.presets[2][1], {powerAssert: true});
		});
});

test('testOptions can disable ava/stage-4', t => {
	const testOptions = {
		presets: [['module:ava/stage-4', false]]
	};
	const transpileEnhancements = true;

	const projectDir = uniqueTempDir();
	const cacheDir = path.join(projectDir, 'cache');
	fs.mkdirSync(projectDir);
	fs.mkdirSync(path.join(projectDir, 'node_modules'));
	fs.mkdirSync(path.join(projectDir, 'node_modules', 'ava'));
	fs.writeFileSync(path.join(projectDir, 'node_modules', 'ava', 'stage-4.js'), `module.exports = require(${JSON.stringify(require.resolve('@ava/babel-preset-stage-4'))})`);

	return babelConfigHelper.build(projectDir, cacheDir, {testOptions}, transpileEnhancements)
		.then(result => {
			const options = result.getOptions();
			t.false(options.babelrc);
			t.is(options.presets[0][0].wrapped, require('@ava/babel-preset-stage-4'));
			t.is(options.presets[0][1], false);
		});
});

test('uses "development" environment if NODE_ENV is the empty string', t => {
	const compileEnhancements = true;

	const projectDir = fixture('babelrc');
	const cacheDir = path.join(uniqueTempDir(), 'cache');
	return withNodeEnv('', () => babelConfigHelper.build(projectDir, cacheDir, {testOptions: {}}, compileEnhancements))
		.then(result => {
			const options = result.getOptions();

			t.false(options.babelrc);
			t.is(options.plugins[0][0].wrapped, require(fixture('babel-plugin-test-capitalizer')));
			t.is(options.presets[0][0].wrapped, require('@ava/babel-preset-stage-4'));
			t.is(options.presets[1][0].wrapped, require('@ava/babel-preset-transform-test-files'));
			t.same(options.presets[1][1], {powerAssert: true});
		});
});

test('supports .babelrc.js files', t => {
	const compileEnhancements = true;

	const projectDir = fixture('babelrc-js');
	const cacheDir = path.join(uniqueTempDir(), 'cache');
	return babelConfigHelper.build(projectDir, cacheDir, {testOptions: {}}, compileEnhancements)
		.then(result => {
			const options = result.getOptions();

			t.false(options.babelrc);
			t.is(options.plugins[0][0].wrapped, require(fixture('babel-plugin-test-doubler')));
			t.is(options.presets[0][0].wrapped, require('@ava/babel-preset-stage-4'));
			t.is(options.presets[1][0].wrapped, require('@ava/babel-preset-transform-test-files'));
			t.same(options.presets[1][1], {powerAssert: true});
		});
});

test('should not include transform-test-files when compileEnhancements is false', t => {
	const compileEnhancements = false;

	const projectDir = fixture('no-babel-config');
	const cacheDir = path.join(uniqueTempDir(), 'cache');
	return babelConfigHelper.build(projectDir, cacheDir, {testOptions: {}}, compileEnhancements)
		.then(result => {
			const options = result.getOptions();

			t.false(options.babelrc);
			t.is(options.presets.length, 1);
		});
});

test('caches and uses results', t => {
	const projectDir = fixture('no-babel-config');
	const cacheDir = path.join(uniqueTempDir(), 'cache');
	return babelConfigHelper.build(projectDir, cacheDir, {testOptions: {}}, true)
		.then(result => {
			const files = fs.readdirSync(cacheDir);
			t.is(files.length, 2);
			t.is(files.filter(f => /\.babel-options\.js$/.test(f)).length, 1);
			t.is(files.filter(f => /\.verifier\.bin$/.test(f)).length, 1);

			const firstCacheKeys = result.cacheKeys;
			const stats = files.map(f => fs.statSync(path.join(cacheDir, f)));
			delete stats[0].atime;
			delete stats[0].atimeMs;
			delete stats[1].atime;
			delete stats[1].atimeMs;

			return babelConfigHelper.build(projectDir, cacheDir, {testOptions: {}}, true)
				.then(result => {
					const newStats = files.map(f => fs.statSync(path.join(cacheDir, f)));
					delete newStats[0].atime;
					delete newStats[0].atimeMs;
					delete newStats[1].atime;
					delete newStats[1].atimeMs;

					t.same(newStats, stats);
					t.same(result.cacheKeys, firstCacheKeys);
				});
		});
});

test('discards cache if testOptions change', t => {
	const projectDir = fixture('no-babel-config');
	const cacheDir = path.join(uniqueTempDir(), 'cache');
	const testOptions = {};
	return babelConfigHelper.build(projectDir, cacheDir, {testOptions}, true)
		.then(result => {
			const files = fs.readdirSync(cacheDir);
			const contents = files.map(f => fs.readFileSync(path.join(cacheDir, f), 'utf8'));
			const firstCacheKeys = result.cacheKeys;

			testOptions.foo = 'bar';
			return babelConfigHelper.build(projectDir, cacheDir, {testOptions}, true)
				.then(result => {
					t.notSame(files.map(f => fs.readFileSync(path.join(cacheDir, f), 'utf8')), contents);
					t.notSame(result.cacheKeys, firstCacheKeys);
				});
		});
});

test('updates cached verifier if dependency hashes change', t => {
	const projectDir = fixture('no-babel-config');
	const tempDir = uniqueTempDir();
	const cacheDir = path.join(tempDir, 'cache');
	const depFile = path.join(tempDir, 'plugin.js');

	makeDir.sync(cacheDir);
	fs.writeFileSync(depFile, 'module.exports = () => ({})');

	const testOptions = {
		plugins: [depFile]
	};
	return babelConfigHelper.build(projectDir, cacheDir, {testOptions}, true)
		.then(result => {
			const verifierFile = fs.readdirSync(cacheDir).find(f => /\.verifier\.bin$/.test(f));
			const contents = fs.readFileSync(path.join(cacheDir, verifierFile), 'utf8');
			const firstCacheKeys = result.cacheKeys;

			fs.writeFileSync(depFile, 'bar');
			return babelConfigHelper.build(projectDir, cacheDir, {testOptions}, true)
				.then(result => {
					t.notSame(contents, fs.readFileSync(path.join(cacheDir, verifierFile), 'utf8'));
					t.notSame(result.cacheKeys.dependencies, firstCacheKeys.dependencies);
					t.same(result.cacheKeys.sources, firstCacheKeys.sources);
				});
		});
});

test('crashes if cached files cannot be read', t => {
	const projectDir = fixture('no-babel-config');
	const cacheDir = path.join(uniqueTempDir(), 'cache');

	t.plan(1);
	return babelConfigHelper.build(projectDir, cacheDir, {testOptions: {}}, true)
		.then(() => {
			for (const f of fs.readdirSync(cacheDir)) {
				fs.unlinkSync(path.join(cacheDir, f));
				fs.mkdirSync(path.join(cacheDir, f));
			}

			return babelConfigHelper.build(projectDir, cacheDir, {testOptions: {}}, true)
				.catch(err => {
					t.is(err.code, 'EISDIR');
				});
		});
});
