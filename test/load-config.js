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

test('finds config in package.json', (t) => {
	changeDir('package-only');
    return loadConf().then(config => {
        return t.test(`check conf ${config}`, (t) => {
            t.is(config.failFast, true)
            t.end()
        })
    });
});


test('throws a warning of both configs are present', t => {
	changeDir('package-yes-file-yes');
	t.rejects(loadConf(), 'Conflicting configuration in ava.config.js and package.json');
	t.end();
});

test('merges in defaults passed with initial call', t => {
	changeDir('package-only');
	const defaults = {
		files: ['123', '!456']
	};
    return loadConf(defaults).then(config => {
        return t.test(`check conf ${config}`, (t) => {
			t.is(config.failFast, true, 'preserves original props');
			t.is(config.files, defaults.files, 'merges in extra props');
            t.end()
        })
    });
});

test('loads config from file with `export default` syntax', t => {
	changeDir('package-no-file-yes');
    return loadConf().then(config => {
        return t.test(`check conf ${config}`, (t) => {
			t.is(config.files, 'config-file-esm-test-value');
            t.end()
        })
    });
});

test('loads config from factory function', t => {
	changeDir('package-no-file-yes-factory');
    return loadConf().then(config => {
        return t.test(`check conf ${config}`, (t) => {
			t.ok(config.files.startsWith(__dirname));
			t.end();
        })
    });
});

//test('throws an error if a config factory does not return a plain object', t => {
//	changeDir('factory-no-plain-return');
//	t.throws(loadConfig);
//	t.end();
//});
//
//test('throws an error if a config does not export a plain object', t => {
//	changeDir('no-plain-config');
//	t.throws(loadConfig);
//	t.end();
//});
//
//test('receives a `projectDir` property', t => {
//	changeDir('package-only');
//	const conf = loadConfig();
//	t.ok(conf.projectDir.startsWith(__dirname));
//	t.end();
//});
//
//test('rethrows wrapped module errors', t => {
//	t.plan(1);
//	changeDir('throws');
//	try {
//		loadConfig();
//	} catch (error) {
//		t.is(error.parent.message, 'foo');
//	}
//});
//
//test('throws an error if a config file has no default export', t => {
//	changeDir('no-default-export');
//	t.throws(loadConfig);
//	t.end();
//});
//
//test('throws an error if a config file contains `ava` property', t => {
//	changeDir('contains-ava-property');
//	t.throws(loadConfig);
//	t.end();
//});
