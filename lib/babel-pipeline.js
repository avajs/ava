'use strict';
const fs = require('fs');
const path = require('path');
const writeFileAtomic = require('@ava/write-file-atomic');
const babel = require('@babel/core');
const concordance = require('concordance');
const convertSourceMap = require('convert-source-map');
const findUp = require('find-up');
const isPlainObject = require('is-plain-object');
const md5Hex = require('md5-hex');
const packageHash = require('package-hash');
const pkgConf = require('pkg-conf');
const stripBomBuf = require('strip-bom-buf');
const pkg = require('../package.json');
const chalk = require('./chalk').get();

function getSourceMap(filePath, code) {
	let sourceMap = convertSourceMap.fromSource(code);

	if (!sourceMap) {
		const dirPath = path.dirname(filePath);
		sourceMap = convertSourceMap.fromMapFileSource(code, dirPath);
	}

	return sourceMap ? sourceMap.toObject() : undefined;
}

function hasValidKeys(conf) {
	return Object.keys(conf).every(key => key === 'extensions' || key === 'testOptions');
}

function isValidExtensions(extensions) {
	return Array.isArray(extensions) && extensions.every(ext => typeof ext === 'string' && ext !== '');
}

function validate(conf) {
	if (conf === false) {
		return null;
	}

	const defaultOptions = {babelrc: true, configFile: true};

	if (conf === undefined) {
		return {testOptions: defaultOptions};
	}

	if (
		!isPlainObject(conf) ||
		!hasValidKeys(conf) ||
		(conf.testOptions !== undefined && !isPlainObject(conf.testOptions)) ||
		(conf.extensions !== undefined && !isValidExtensions(conf.extensions))
	) {
		throw new Error(`Unexpected Babel configuration for AVA. See ${chalk.underline(`https://github.com/avajs/ava/blob/v${pkg.version}/docs/recipes/babel.md`)} for allowed values.`);
	}

	return {
		extensions: conf.extensions,
		testOptions: Object.assign({}, defaultOptions, conf.testOptions)
	};
}

// Compare actual values rather than file paths, which should be
// more reliable.
function makeValueChecker(ref) {
	const expected = require(ref);
	return ({value}) => value === expected || value === expected.default;
}

// Resolved paths are used to create the config item, rather than the plugin
// function itself, so Babel can print better error messages.
// See <https://github.com/babel/babel/issues/7921>.
function createConfigItem(ref, type, options = {}) {
	return babel.createConfigItem([require.resolve(ref), options], {type});
}

// Assume the stage-4 preset is wanted if there are `userOptions`, but there is
// no declaration of a stage-` preset that comes with `false` for its options.
//
// Ideally we'd detect the stage-4 preset anywhere in the configuration
// hierarchy, but Babel's loadPartialConfig() does not return disabled presets.
// See <https://github.com/babel/babel/issues/7920>.
function wantsStage4(userOptions, projectDir) {
	if (!userOptions) {
		return false;
	}

	if (!userOptions.testOptions.presets) {
		return true;
	}

	const stage4 = require('../stage-4');
	return userOptions.testOptions.presets.every(arr => {
		if (!Array.isArray(arr)) {
			return true; // There aren't any preset options.
		}

		const [ref, options] = arr;
		// Require the preset given the aliasing `ava/stage-4` does towards
		// `@ava/babel-preset-stage-4`.
		const resolved = require(babel.resolvePreset(ref, projectDir));
		return resolved !== stage4 || options !== false;
	});
}

function hashPartialTestConfig({babelrc, config, options: {plugins, presets}}, projectDir, pluginAndPresetHashes) {
	const inputs = [];
	if (babelrc) {
		inputs.push(babelrc);

		const filename = path.basename(babelrc);
		if (filename === 'package.json') {
			inputs.push(JSON.stringify(pkgConf.sync('babel', {cwd: path.dirname(filename)})));
		} else {
			inputs.push(stripBomBuf(fs.readFileSync(babelrc)));
		}
	}

	if (config) {
		inputs.push(config, stripBomBuf(fs.readFileSync(config)));
	}

	for (const {file: {resolved: filename}} of [...plugins, ...presets]) {
		if (pluginAndPresetHashes.has(filename)) {
			inputs.push(pluginAndPresetHashes.get(filename));
			continue;
		}

		const [firstComponent] = path.relative(projectDir, filename).split(path.sep);
		let hash;
		if (firstComponent === 'node_modules') {
			hash = packageHash.sync(findUp.sync('package.json', {cwd: path.dirname(filename)}));
		} else {
			hash = md5Hex(stripBomBuf(fs.readFileSync(filename)));
		}

		pluginAndPresetHashes.set(filename, hash);
		inputs.push(hash);
	}

	return md5Hex(inputs);
}

function build(projectDir, cacheDir, userOptions, compileEnhancements) {
	if (!userOptions && !compileEnhancements) {
		return null;
	}

	// Note that Babel ignores empty string values, even for NODE_ENV. Here
	// default to 'test' unless NODE_ENV is defined, in which case fall back to
	// Babel's default of 'development' if it's empty.
	const envName = process.env.BABEL_ENV || ('NODE_ENV' in process.env ? process.env.NODE_ENV : 'test') || 'development';

	// Prepare inputs for caching seeds. Compute a seed based on the Node.js
	// version and the project directory. Dependency hashes may vary based on the
	// Node.js version, e.g. with the @ava/stage-4 Babel preset. Certain plugins
	// and presets are provided as absolute paths, which wouldn't necessarily
	// be valid if the project directory changes. Also include `envName`, so
	// options can be cached even if users change BABEL_ENV or NODE_ENV between
	// runs.
	const seedInputs = [
		process.versions.node,
		packageHash.sync(require.resolve('../package.json')),
		projectDir,
		envName,
		concordance.serialize(concordance.describe(userOptions))
	];

	const partialCacheKey = md5Hex(seedInputs);
	const pluginAndPresetHashes = new Map();

	const ensureStage4 = wantsStage4(userOptions, projectDir);
	const containsAsyncGenerators = makeValueChecker('@babel/plugin-syntax-async-generators');
	const containsObjectRestSpread = makeValueChecker('@babel/plugin-syntax-object-rest-spread');
	const containsOptionalCatchBinding = makeValueChecker('@babel/plugin-syntax-optional-catch-binding');
	const containsStage4 = makeValueChecker('../stage-4');
	const containsTransformTestFiles = makeValueChecker('@ava/babel-preset-transform-test-files');

	const loadOptions = filename => {
		const partialTestConfig = babel.loadPartialConfig(Object.assign({
			babelrc: false,
			babelrcRoots: [projectDir],
			configFile: false,
			sourceMaps: true
		}, userOptions && userOptions.testOptions, {
			cwd: projectDir,
			envName,
			filename,
			sourceFileName: path.relative(projectDir, filename),
			sourceRoot: projectDir
		}));

		if (!partialTestConfig) {
			return {hash: '', options: null};
		}

		const {options: testOptions} = partialTestConfig;
		if (!testOptions.plugins.some(containsAsyncGenerators)) { // TODO: Remove once Babel can parse this syntax unaided.
			testOptions.plugins.unshift(createConfigItem('@babel/plugin-syntax-async-generators', 'plugin'));
		}

		if (!testOptions.plugins.some(containsObjectRestSpread)) { // TODO: Remove once Babel can parse this syntax unaided.
			testOptions.plugins.unshift(createConfigItem('@babel/plugin-syntax-object-rest-spread', 'plugin'));
		}

		if (!testOptions.plugins.some(containsOptionalCatchBinding)) { // TODO: Remove once Babel can parse this syntax unaided.
			testOptions.plugins.unshift(createConfigItem('@babel/plugin-syntax-optional-catch-binding', 'plugin'));
		}

		if (ensureStage4 && !testOptions.presets.some(containsStage4)) {
			// Apply last.
			testOptions.presets.unshift(createConfigItem('../stage-4', 'preset'));
		}

		if (compileEnhancements && !testOptions.presets.some(containsTransformTestFiles)) {
			// Apply first.
			testOptions.presets.push(createConfigItem('@ava/babel-preset-transform-test-files', 'preset', {powerAssert: true}));
		}

		const hash = hashPartialTestConfig(partialTestConfig, projectDir, pluginAndPresetHashes);
		const options = babel.loadOptions(testOptions);
		return {hash, options};
	};

	return filename => {
		const {hash: optionsHash, options} = loadOptions(filename);
		if (!options) {
			return null;
		}

		const contents = stripBomBuf(fs.readFileSync(filename));
		const ext = path.extname(filename);
		const hash = md5Hex([partialCacheKey, contents, optionsHash]);
		const cachePath = path.join(cacheDir, `${hash}${ext}`);

		if (fs.existsSync(cachePath)) {
			return cachePath;
		}

		const inputCode = contents.toString('utf8');
		const inputSourceMap = getSourceMap(filename, inputCode);
		if (inputSourceMap) {
			options.inputSourceMap = inputSourceMap;
		}

		const {code, map} = babel.transformSync(inputCode, options);

		if (map) {
			// Save source map
			const mapPath = `${cachePath}.map`;
			writeFileAtomic.sync(mapPath, JSON.stringify(map));

			// Append source map comment to transformed code so that other libraries
			// (like nyc) can find the source map.
			const comment = convertSourceMap.generateMapFileComment(mapPath);
			writeFileAtomic.sync(cachePath, `${code}\n${comment}`);
		} else {
			writeFileAtomic.sync(cachePath, code);
		}

		return cachePath;
	};
}

module.exports = {
	validate,
	build
};
