'use strict';
const fs = require('fs');
const path = require('path');
const test = require('tap').test;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const fixture = name => path.join(__dirname, 'fixture', name);

function setUp() {
	const customPlugin = sinon.stub().returns({visitor: {}});
	const stage4 = sinon.stub().returns({plugins: []});
	const transformTestfiles = sinon.stub().returns({plugins: []});

	return {
		customPlugin,
		stage4,
		transformTestfiles
	};
}

test('uses stage-4 preset when babelConfig is "default"', t => {
	const setup = setUp();

	const babelConfigHelper = proxyquire('../lib/babel-config', {
		'@ava/babel-preset-stage-4': setup.stage4,
		'@ava/babel-preset-transform-test-files': setup.transformTestfiles
	});

	const babelConfig = 'default';

	const fixturePath = fixture('es2015.js');
	const fixtureSource = fs.readFileSync(fixturePath, 'utf8');

	const powerAssert = true;
	const options = babelConfigHelper.build(babelConfig, powerAssert, fixturePath, fixtureSource);

	t.true('filename' in options);
	t.true(options.sourceMaps);
	t.false(options.ast);
	t.true('inputSourceMap' in options);
	t.false(options.babelrc);
	const babel = {};
	t.strictEqual(options.presets[0](babel), setup.stage4());
	options.presets[1](babel);
	t.strictDeepEqual(setup.transformTestfiles.args[0], [babel, {powerAssert}]);
	t.end();
});

test('uses babelConfig for babel options when babelConfig is an object', t => {
	const setup = setUp();
	const customPlugin = setup.customPlugin;

	const babelConfigHelper = proxyquire('../lib/babel-config', {
		'@ava/babel-preset-stage-4': setup.stage4,
		'@ava/babel-preset-transform-test-files': setup.transformTestfiles
	});

	const babelConfig = {
		presets: ['stage-2'],
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
	t.strictDeepEqual(options.presets.slice(0, 1), ['stage-2']);
	const babel = {};
	options.presets[1](babel);
	t.strictDeepEqual(setup.transformTestfiles.args[0], [babel, {powerAssert}]);
	t.strictDeepEqual(options.plugins, [customPlugin]);
	t.end();
});

test('should reuse existing source maps', t => {
	const setup = setUp();
	const customPlugin = setup.customPlugin;

	const babelConfigHelper = proxyquire('../lib/babel-config', {
		'@ava/babel-preset-stage-4': setup.stage4,
		'@ava/babel-preset-transform-test-files': setup.transformTestfiles
	});

	const babelConfig = {
		presets: ['stage-2'],
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
	t.strictDeepEqual(options.presets.slice(0, 1), ['stage-2']);
	const babel = {};
	options.presets[1](babel);
	t.strictDeepEqual(setup.transformTestfiles.args[0], [babel, {powerAssert}]);
	t.strictDeepEqual(options.plugins, [customPlugin]);
	t.end();
});

test('should disable power-assert when powerAssert is false', t => {
	const setup = setUp();
	const customPlugin = setup.customPlugin;

	const babelConfigHelper = proxyquire('../lib/babel-config', {
		'@ava/babel-preset-stage-4': setup.stage4,
		'@ava/babel-preset-transform-test-files': setup.transformTestfiles
	});

	const babelConfig = {
		presets: ['stage-2'],
		plugins: [customPlugin]
	};

	const fixturePath = fixture('es2015.js');
	const fixtureSource = fs.readFileSync(fixturePath, 'utf8');

	const powerAssert = false;
	const options = babelConfigHelper.build(babelConfig, powerAssert, fixturePath, fixtureSource);

	t.strictDeepEqual(options.presets.slice(0, 1), ['stage-2']);
	const babel = {};
	options.presets[1](babel);
	t.strictDeepEqual(setup.transformTestfiles.args[0], [babel, {powerAssert}]);
	t.end();
});
