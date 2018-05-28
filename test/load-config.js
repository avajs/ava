'use strict';
const path = require('path');
const tap = require('tap');
const loadConfig = require('../lib/load-config');

const {test} = tap;

tap.afterEach(done => {
	process.chdir(path.resolve(__dirname, '..'));
	done();
});

const changeDir = fixtureDir => {
	process.chdir(path.resolve(__dirname, 'fixture', 'load-config', fixtureDir));
};

test('finds config in package.json', t => {
	changeDir('package-only');
	const conf = loadConfig();
	t.is(conf.failFast, true);
	t.end();
});

test('throws a warning of both configs are present', t => {
	changeDir('package-yes-file-yes');
	t.throws(loadConfig);
	t.end();
});

test('merges in defaults passed with initial call', t => {
	changeDir('package-only');
	const defaults = {
		files: ['123', '!456']
	};
	const {files, failFast} = loadConfig(defaults);
	t.is(failFast, true, 'preserves original props');
	t.is(files, defaults.files, 'merges in extra props');
	t.end();
});

test('loads config from file with `export default` syntax', t => {
	changeDir('package-no-file-yes');
	const conf = loadConfig();
	t.is(conf.files, 'config-file-esm-test-value');
	t.end();
});

test('loads config from factory function', t => {
	changeDir('package-no-file-yes-factory');
	const conf = loadConfig();
	t.ok(conf.files.startsWith(__dirname));
	t.end();
});

test('throws an error if a config file returns a promise', t => {
	changeDir('factory-no-promise-return');
	t.throws(loadConfig);
	t.end();
});

test('throws an error if a config file is a promise', t => {
	changeDir('no-promise-config');
	t.throws(loadConfig);
	t.end();
});

test('receives a `projectDir` property', t => {
	changeDir('package-only');
	const conf = loadConfig();
	t.ok(conf.projectDir.startsWith(__dirname));
	t.end();
});
