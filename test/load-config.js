'use strict';
const path = require('path');
const tap = require('tap');
const loadConf = require('../lib/load-config');

const {test} = tap;

tap.afterEach(done => {
	process.chdir(path.resolve(__dirname, '..'));
	done();
});

const changeDir = fixtureDir => {
	process.chdir(path.resolve(__dirname, 'fixture', 'load-config', fixtureDir));
};

test('finds config in package.json', async () => {
	changeDir('package-only');
	const conf = await loadConf();
	test('finds config in package.json', t => {
		t.is(conf.failFast, true);
		t.end();
	});
});

test('throws a warning if both configs are present', async t => {
	changeDir('package-yes-file-yes');
	t.throws(await loadConf());
	t.end();
});

test('merges in defaults passed with initial call', async t => {
	changeDir('package-only');
	const defaults = {
		files: ['123', '!456']
	};
	const {files, failFast} = await loadConf(defaults);
	t.is(failFast, true, 'preserves original props');
	t.is(files, defaults.files, 'merges in extra props');
	t.end();
});

test('loads config from file with `export default` syntax', async t => {
	changeDir('package-no-file-yes');
	const conf = await loadConf();
	t.is(conf.files, 'config-file-esm-test-value');
	t.end();
});

test('loads config from factory function', async t => {
	changeDir('package-no-file-yes-factory');
	const conf = await loadConf();
	t.ok(conf.files.startsWith(__dirname));
	t.end();
});

test('accepts a promise from loadConf', async t => {
	changeDir('factory-no-promise-return');
	const conf = await loadConf();
	t.is(conf.files, 'this-should-not-work');
	t.end();
});

test('throws an error if a config exports a promise', async t => {
	changeDir('no-promise-config');
	const conf = await loadConf();
	t.is(conf, 'should not work!');
	t.end();
});

test('throws an error if a config factory does not return a plain object', async t => {
	changeDir('factory-no-plain-return');
	t.throws(await loadConf());
	t.end();
});

test('throws an error if a config does not export a plain object', t => {
	changeDir('no-plain-config');
	t.throws(loadConf);
	t.end();
});

test('receives a `projectDir` property', async t => {
	changeDir('package-only');
	const conf = await loadConf();
	t.ok(conf.projectDir.startsWith(__dirname));
	t.end();
});

test('rethrows wrapped module errors', async t => {
	t.plan(1);
	changeDir('throws');
	try {
		await loadConf();
	} catch (error) {
		t.is(error.parent.message, 'foo');
	}
});

test('throws an error if a config file has no default export', async t => {
	changeDir('no-default-export');
	t.throws(await loadConf);
	t.end();
});
