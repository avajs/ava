'use strict';
const fs = require('fs');
const path = require('path');
const test = require('tap').test;
const makeDir = require('make-dir');
const uniqueTempDir = require('unique-temp-dir');

const babelConfigHelper = require('../lib/babel-config');

const fixture = name => path.join(__dirname, 'fixture', name);
const setNodeVersion = value => Object.defineProperty(process.versions, 'node', {value});
const resetNodeVersion = setNodeVersion.bind(null, process.versions.node);

// Execute `run` with a given stubbed node version, then reset to the real
// version.
function withNodeVersion(version, run) {
	setNodeVersion(version);
	const promise = new Promise(resolve => {
		resolve(run());
	});
	promise.then(resetNodeVersion, resetNodeVersion);
	return promise;
}

test('uses default presets when userOptions is "default"', t => {
	const userOptions = 'default';
	const powerAssert = true;

	const projectDir = uniqueTempDir();
	const cacheDir = path.join(projectDir, 'cache');
	return babelConfigHelper.build(projectDir, cacheDir, userOptions, powerAssert)
		.then(result => {
			const options = result.getOptions();

			t.false(options.babelrc);
			t.same(options.presets, [
				require.resolve('@ava/babel-preset-stage-4'),
				[
					require.resolve('@ava/babel-preset-transform-test-files'),
					{powerAssert}
				]
			]);
		});
});

test('uses options from babelrc when userOptions is "inherit"', t => {
	const userOptions = 'inherit';
	const powerAssert = true;

	const projectDir = fixture('babelrc');
	const cacheDir = path.join(uniqueTempDir(), 'cache');
	return babelConfigHelper.build(projectDir, cacheDir, userOptions, powerAssert)
		.then(result => {
			const options = result.getOptions();

			t.false(options.babelrc);
			t.same(options.plugins, [require.resolve(fixture('babel-plugin-test-doubler'))]);
			t.same(options.presets, [
				require.resolve('@ava/babel-preset-stage-4'),
				[
					require.resolve('@ava/babel-preset-transform-test-files'),
					{powerAssert}
				]
			]);
		});
});

test('uses userOptions for babel options when userOptions is an object', t => {
	const custom = require.resolve(fixture('empty'));
	const userOptions = {
		presets: [custom],
		plugins: [custom]
	};
	const powerAssert = true;

	const projectDir = uniqueTempDir();
	const cacheDir = path.join(projectDir, 'cache');
	return babelConfigHelper.build(projectDir, cacheDir, userOptions, powerAssert)
		.then(result => {
			const options = result.getOptions();

			t.false(options.babelrc);
			t.same(options.presets, userOptions.presets.concat([
				[
					require.resolve('@ava/babel-preset-transform-test-files'),
					{powerAssert}
				]
			]));
			t.same(options.plugins, userOptions.plugins);
		});
});

test('adds babel-plugin-syntax-object-rest-spread for node versions > 8.3.0', t => {
	const projectDir = uniqueTempDir();
	const cacheDir = path.join(projectDir, 'cache');

	return withNodeVersion('9.0.0', () => babelConfigHelper.build(projectDir, cacheDir, 'default', true))
		.then(result => {
			const options = result.getOptions();
			t.same(options.plugins, [
				require.resolve('@babel/plugin-syntax-object-rest-spread')
			]);
		});
});

test('adds babel-plugin-syntax-object-rest-spread for node versions == 8.3.0', t => {
	const projectDir = uniqueTempDir();
	const cacheDir = path.join(projectDir, 'cache');

	return withNodeVersion('8.3.0', () => babelConfigHelper.build(projectDir, cacheDir, 'default', true))
		.then(result => {
			const options = result.getOptions();
			t.same(options.plugins, [
				require.resolve('@babel/plugin-syntax-object-rest-spread')
			]);
		});
});

test('does not add babel-plugin-syntax-object-rest-spread for node versions < 8.3.0', t => {
	const projectDir = uniqueTempDir();
	const cacheDir = path.join(projectDir, 'cache');

	return withNodeVersion('8.2.0', () => babelConfigHelper.build(projectDir, cacheDir, 'default', true))
		.then(result => {
			const options = result.getOptions();
			t.same(options.plugins, []);
		});
});

test('should disable power-assert when powerAssert is false', t => {
	const userOptions = 'default';
	const powerAssert = false;

	const projectDir = uniqueTempDir();
	const cacheDir = path.join(projectDir, 'cache');
	return babelConfigHelper.build(projectDir, cacheDir, userOptions, powerAssert)
		.then(result => {
			const options = result.getOptions();

			t.false(options.babelrc);
			t.same(options.presets, [
				require.resolve('@ava/babel-preset-stage-4'),
				[
					require.resolve('@ava/babel-preset-transform-test-files'),
					{powerAssert}
				]
			]);
		});
});

test('caches and uses results', t => {
	const projectDir = uniqueTempDir();
	const cacheDir = path.join(projectDir, 'cache');
	return babelConfigHelper.build(projectDir, cacheDir, 'default', true)
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

			return babelConfigHelper.build(projectDir, cacheDir, 'default', true)
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

test('discards cache if userOptions change', t => {
	const projectDir = uniqueTempDir();
	const cacheDir = path.join(projectDir, 'cache');
	const userOptions = {};
	return babelConfigHelper.build(projectDir, cacheDir, userOptions, true)
		.then(result => {
			const files = fs.readdirSync(cacheDir);
			const contents = files.map(f => fs.readFileSync(path.join(cacheDir, f), 'utf8'));
			const firstCacheKeys = result.cacheKeys;

			userOptions.foo = 'bar';
			return babelConfigHelper.build(projectDir, cacheDir, userOptions, true)
				.then(result => {
					t.notSame(files.map(f => fs.readFileSync(path.join(cacheDir, f), 'utf8')), contents);
					t.notSame(result.cacheKeys, firstCacheKeys);
				});
		});
});

test('updates cached verifier if dependency hashes change', t => {
	const projectDir = uniqueTempDir();
	const cacheDir = path.join(projectDir, 'cache');
	const depFile = path.join(projectDir, 'plugin.js');

	makeDir.sync(cacheDir);
	fs.writeFileSync(depFile, 'foo');

	const userOptions = {
		plugins: ['./plugin.js']
	};
	return babelConfigHelper.build(projectDir, cacheDir, userOptions, true)
		.then(result => {
			const verifierFile = fs.readdirSync(cacheDir).find(f => /\.verifier\.bin$/.test(f));
			const contents = fs.readFileSync(path.join(cacheDir, verifierFile), 'utf8');
			const firstCacheKeys = result.cacheKeys;

			fs.writeFileSync(depFile, 'bar');
			return babelConfigHelper.build(projectDir, cacheDir, userOptions, true)
				.then(result => {
					t.notSame(contents, fs.readFileSync(path.join(cacheDir, verifierFile), 'utf8'));
					t.notSame(result.cacheKeys.dependencies, firstCacheKeys.dependencies);
					t.same(result.cacheKeys.sources, firstCacheKeys.sources);
				});
		});
});

test('crashes if cached files cannot be read', t => {
	const projectDir = uniqueTempDir();
	const cacheDir = path.join(projectDir, 'cache');

	t.plan(1);
	return babelConfigHelper.build(projectDir, cacheDir, 'default', true)
		.then(() => {
			for (const f of fs.readdirSync(cacheDir)) {
				fs.unlinkSync(path.join(cacheDir, f));
				fs.mkdirSync(path.join(cacheDir, f));
			}

			return babelConfigHelper.build(projectDir, cacheDir, 'default', true)
				.catch(err => {
					t.is(err.code, 'EISDIR');
				});
		});
});
