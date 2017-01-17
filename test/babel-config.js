'use strict';
const fs = require('fs');
const path = require('path');
const test = require('tap').test;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const throwsHelper = require('babel-plugin-ava-throws-helper');
const transformRuntime = require('babel-plugin-transform-runtime');

const fixture = name => path.join(__dirname, 'fixture', name);

function setUp() {
	const customPlugin = sinon.stub().returns({visitor: {}});
	const powerAssert = sinon.stub().returns({visitor: {}});
	const rewrite = sinon.stub().returns({visitor: {}});
	const createEspowerPlugin = () => powerAssert;
	const babelDetectiveWrap = () => rewrite;

	return {
		customPlugin,
		powerAssert,
		rewrite,
		createEspowerPlugin,
		babelDetectiveWrap
	};
}

test('uses babelConfig for babel options when babelConfig is an object', t => {
	const setup = setUp();
	const customPlugin = setup.customPlugin;

	const babelConfigHelper = proxyquire('../lib/babel-config', {
		'babel-plugin-espower/create': setup.createEspowerPlugin,
		'babel-plugin-detective/wrap-listener': setup.babelDetectiveWrap
	});

	const babelConfig = {
		presets: ['stage-2', ['env', {targets: {node: 'current'}}]],
		plugins: [customPlugin]
	};

	const fixturePath = fixture('es2015.js');
	const fixtureSource = fs.readFileSync(fixturePath, 'utf8');

	const powerAssert = true;
	const options = babelConfigHelper.build(babelConfig, powerAssert, fixturePath, fixtureSource);

	t.true('filename' in options);
	t.true(options.sourceMaps);
	t.false(options.ast);
	t.true('inputSourceMap' in options);
	t.false(options.babelrc);
	t.strictDeepEqual(options.presets, ['stage-2', ['env', {targets: {node: 'current'}}]]);
	t.strictDeepEqual(options.plugins, [customPlugin, setup.powerAssert, throwsHelper, setup.rewrite, transformRuntime]);
	t.end();
});

test('should reuse existing source maps', t => {
	const setup = setUp();
	const customPlugin = setup.customPlugin;

	const babelConfigHelper = proxyquire('../lib/babel-config', {
		'babel-plugin-espower/create': setup.createEspowerPlugin,
		'babel-plugin-detective/wrap-listener': setup.babelDetectiveWrap
	});

	const babelConfig = {
		presets: ['stage-2', ['env', {targets: {node: 'current'}}]],
		plugins: [customPlugin]
	};

	const fixturePath = fixture('es2015-source-maps.js');
	const fixtureSource = fs.readFileSync(fixturePath, 'utf8');

	const powerAssert = true;
	const options = babelConfigHelper.build(babelConfig, powerAssert, fixturePath, fixtureSource);

	t.true('filename' in options);
	t.true(options.sourceMaps);
	t.false(options.ast);
	t.true('inputSourceMap' in options);
	t.strictDeepEqual(options.presets, ['stage-2', ['env', {targets: {node: 'current'}}]]);
	t.strictDeepEqual(options.plugins, [customPlugin, setup.powerAssert, throwsHelper, setup.rewrite, transformRuntime]);
	t.end();
});

test('should disable power-assert when powerAssert is false', t => {
	const setup = setUp();
	const customPlugin = setup.customPlugin;

	const babelConfigHelper = proxyquire('../lib/babel-config', {
		'babel-plugin-espower/create': setup.createEspowerPlugin,
		'babel-plugin-detective/wrap-listener': setup.babelDetectiveWrap
	});

	const babelConfig = {
		presets: ['stage-2', ['env', {targets: {node: 'current'}}]],
		plugins: [customPlugin]
	};

	const fixturePath = fixture('es2015.js');
	const fixtureSource = fs.readFileSync(fixturePath, 'utf8');

	const powerAssert = false;
	const options = babelConfigHelper.build(babelConfig, powerAssert, fixturePath, fixtureSource);

	t.strictDeepEqual(options.plugins, [customPlugin, throwsHelper, setup.rewrite, transformRuntime]);
	t.end();
});
