'use strict';
var fs = require('fs');
var path = require('path');
var test = require('tap').test;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru();
var throwsHelper = require('babel-plugin-ava-throws-helper');
var transformRuntime = require('babel-plugin-transform-runtime');

function fixture(name) {
	return path.join(__dirname, 'fixture', name);
}

function setUp() {
	var customPlugin = sinon.stub().returns({visitor: {}});
	var powerAssert = sinon.stub().returns({visitor: {}});
	var rewrite = sinon.stub().returns({visitor: {}});

	function createEspowerPlugin() {
		return powerAssert;
	}

	function babelDetectiveWrap() {
		return rewrite;
	}

	return {
		customPlugin: customPlugin,
		powerAssert: powerAssert,
		rewrite: rewrite,
		createEspowerPlugin: createEspowerPlugin,
		babelDetectiveWrap: babelDetectiveWrap
	};
}

test('uses babelConfig for babel options when babelConfig is an object', function (t) {
	var setup = setUp();
	var customPlugin = setup.customPlugin;

	var babelConfigHelper = proxyquire('../lib/babel-config', {
		'babel-plugin-espower/create': setup.createEspowerPlugin,
		'babel-plugin-detective/wrap-listener': setup.babelDetectiveWrap
	});

	var babelConfig = {
		presets: ['stage-2', 'es2015'],
		plugins: [customPlugin]
	};

	var fixturePath = fixture('es2015.js');
	var fixtureSource = fs.readFileSync(fixturePath, 'utf8');

	var options = babelConfigHelper.build(babelConfig, fixturePath, fixtureSource);

	t.true('filename' in options);
	t.true(options.sourceMaps);
	t.false(options.ast);
	t.true('inputSourceMap' in options);
	t.false(options.babelrc);
	t.strictDeepEqual(options.presets, ['stage-2', 'es2015']);
	t.strictDeepEqual(options.plugins, [customPlugin, setup.powerAssert, throwsHelper, setup.rewrite, transformRuntime]);
	t.end();
});

test('should reuse existing source maps', function (t) {
	var setup = setUp();
	var customPlugin = setup.customPlugin;

	var babelConfigHelper = proxyquire('../lib/babel-config', {
		'babel-plugin-espower/create': setup.createEspowerPlugin,
		'babel-plugin-detective/wrap-listener': setup.babelDetectiveWrap
	});

	var babelConfig = {
		presets: ['stage-2', 'es2015'],
		plugins: [customPlugin]
	};

	var fixturePath = fixture('es2015-source-maps.js');
	var fixtureSource = fs.readFileSync(fixturePath, 'utf8');

	var options = babelConfigHelper.build(babelConfig, fixturePath, fixtureSource);

	t.true('filename' in options);
	t.true(options.sourceMaps);
	t.false(options.ast);
	t.true('inputSourceMap' in options);
	t.strictDeepEqual(options.presets, ['stage-2', 'es2015']);
	t.strictDeepEqual(options.plugins, [customPlugin, setup.powerAssert, throwsHelper, setup.rewrite, transformRuntime]);
	t.end();
});
