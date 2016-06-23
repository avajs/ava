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

test('uses babelConfig for babel options when babelConfig is an object', function (t) {
	var customPlugin = sinon.stub().returns({visitor: {}});
	var powerAssert = sinon.stub().returns({visitor: {}});
	var rewrite = sinon.stub().returns({visitor: {}});

	function createEspowerPlugin() {
		return powerAssert;
	}

	function babelDetectiveWrap() {
		return rewrite;
	}

	var babelConfigHelper = proxyquire('../lib/babel-config', {
		'babel-plugin-espower/create': createEspowerPlugin,
		'babel-plugin-detective/wrap-listener': babelDetectiveWrap
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
	t.strictDeepEqual(options.plugins, [customPlugin, powerAssert, throwsHelper, rewrite, transformRuntime]);
	t.end();
});
