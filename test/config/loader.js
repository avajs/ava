import path from 'node:path';
import {fileURLToPath} from 'node:url';

import test from '@ava/test';
import sinon from 'sinon';

import {loadConfig} from '../../lib/load-config.js';

const FIXTURE_ROOT = fileURLToPath(new URL('../../test-tap/fixture/load-config', import.meta.url));

const resolve = relpath => path.resolve(FIXTURE_ROOT, relpath);

const loadFromSetup = async setup => {
	if (typeof setup === 'string') {
		const loaded = await loadConfig();
		return loaded.config;
	}

	const {configFile, defaults, resolveFrom} = setup;
	const loaded = await loadConfig({configFile, defaults, resolveFrom});
	return loaded.config;
};

const ok = setup => async (t, assert = tt => tt.pass()) => {
	const fixture = typeof setup === 'string' ? setup : setup.fixture;

	const stub = sinon.stub(process, 'cwd');
	t.teardown(() => stub.restore());
	stub.returns(resolve(fixture));

	const conf = loadFromSetup(setup);
	await t.notThrowsAsync(conf);
	const result = await t.try(assert, await conf, setup);
	result.commit();
};

const notOk = setup => async (t, assert = (tt, error) => tt.snapshot(error.message, 'error message')) => {
	const fixture = typeof setup === 'string' ? setup : setup.fixture;

	const stub = sinon.stub(process, 'cwd');
	t.teardown(() => stub.restore());
	stub.returns(resolve(fixture));

	const conf = loadFromSetup(setup);
	const error = await t.throwsAsync(conf);
	const result = await t.try(assert, error, setup);
	result.commit();
};

test.serial('finds config in package.json', ok('package-only'), (t, conf) => {
	t.true(conf.failFast);
});

test.serial('loads config from a particular directory', ok({
	fixture: 'throws',
	resolveFrom: resolve('package-only'),
}), (t, conf) => {
	t.true(conf.failFast);
});

test.serial('throws an error if both configs are present', notOk('package-yes-file-yes'));

test.serial('explicit configFile option overrides package.json config', ok({
	fixture: 'package-yes-explicit-yes',
	configFile: 'explicit.js',
}), (t, conf) => {
	t.is(conf.files, 'package-yes-explicit-yes-test-value');
});

test.serial('configFile does not need to be in the same directory as the package.json file', ok({
	fixture: 'package-yes-explicit-yes',
	configFile: 'nested/explicit.js',
}), (t, config) => {
	t.is(path.relative(config.projectDir, config.configFile), path.normalize('nested/explicit.js'));
});

test.serial('throws if configFile option has an unsupported extension', notOk({
	fixture: 'explicit-bad-extension',
	configFile: 'explicit.txt',
}));

test.serial('merges in defaults passed with initial call', ok({
	fixture: 'package-only',
	defaults: {
		files: ['123', '!456'],
	},
}), (t, conf, {defaults}) => {
	t.true(conf.failFast, 'preserves original props');
	t.is(conf.files, defaults.files, 'merges in extra props');
});

test.serial('loads config from file with `export default` syntax', ok('package-no-file-yes'), (t, conf) => {
	t.is(conf.files, 'config-file-esm-test-value');
});

test.serial('loads config from factory function', ok('package-no-file-yes-factory'), (t, conf) => {
	t.assert(conf.files.startsWith(FIXTURE_ROOT));
});

test.serial('does not support require() inside config.js files', notOk('require'), (t, error) => {
	t.true(error.message.startsWith('Error loading ava.config.js: require is not defined'));
});

test.serial('throws an error if a config factory does not return a plain object', notOk('factory-no-plain-return'));

test.serial('throws an error if a config does not export a plain object', notOk('no-plain-config'));

test.serial('receives a `projectDir` property', (...args) => ok('package-only')(...args), (t, conf) => {
	t.assert(conf.projectDir.startsWith(FIXTURE_ROOT));
});

test.serial('rethrows wrapped module errors', notOk('throws'), (t, error) => {
	t.is(error.cause.message, 'foo');
});

test.serial('throws an error if a .js config file has no default export', notOk('no-default-export'));

test.serial('throws an error if a config file contains `ava` property', notOk('contains-ava-property'));

test.serial('throws an error if a config file contains a non-object `nonSemVerExperiments` property', notOk('non-object-experiments'));

test.serial('throws an error if a config file enables an unsupported experiment', notOk('unsupported-experiments'));

test.serial('loads .cjs config', ok('cjs'), (t, conf) => {
	t.assert(conf.files.startsWith(FIXTURE_ROOT));
});

test.serial('throws an error if both .js and .cjs configs are present', notOk('file-yes-cjs-yes'));
