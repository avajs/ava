import path from 'node:path';
import {fileURLToPath} from 'node:url';

import test from '@ava/test';
import sinon from 'sinon';

import {loadConfig} from '../../lib/load-config.js';

const FIXTURE_ROOT = fileURLToPath(new URL('fixtures', import.meta.url));

const resolve = relpath => path.resolve(FIXTURE_ROOT, relpath);

const loadFromSetup = setup => {
	if (typeof setup === 'string') {
		return loadConfig();
	}

	const {configFile, defaults, resolveFrom} = setup;
	return loadConfig({configFile, defaults, resolveFrom});
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

test.serial('loads .mjs config', ok('mjs'), (t, conf) => {
	t.true(conf.failFast);
});

test.serial('handles errors when loading .mjs config', notOk({
	fixture: 'mjs',
	configFile: 'error.mjs',
}));

test.serial('fails when .mjs config does not have a default export', notOk({
	fixture: 'mjs',
	configFile: 'no-default-export.mjs',
}));

test.serial('loads .js config as CommonJS', ok('js-as-cjs'), (t, conf) => {
	t.true(conf.failFast);
});

test.serial('loads .js config as ESM', ok('js-as-esm'), (t, conf) => {
	t.true(conf.failFast);
});

test.serial('handles errors when loading .js config as ESM', notOk({
	fixture: 'js-as-esm',
	configFile: 'error.js',
}));

test.serial('fails when .js config does not have a default export', notOk({
	fixture: 'js-as-esm',
	configFile: 'no-default-export.js',
}));

test.serial('throws an error if .js, .cjs and .mjs configs are present', notOk('file-yes-cjs-yes-mjs-yes'));

test.serial('config factory returns a promise', ok('factory-promise-return'), (t, conf) => {
	t.true(conf.failFast);
});

test.serial('config exports a promise', ok('promise-config'), (t, conf) => {
	t.true(conf.failFast);
});

