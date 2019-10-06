'use strict';
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const concordance = require('concordance');
const convertSourceMap = require('convert-source-map');
const findUp = require('find-up');
const isPlainObject = require('is-plain-object');
const md5Hex = require('md5-hex');
const packageHash = require('package-hash');
const pkgConf = require('pkg-conf');
const installPrecompiler = require('require-precompiled');
const sourceMapSupport = require('source-map-support');
const stripBomBuf = require('strip-bom-buf');
const writeFileAtomic = require('write-file-atomic');

function getSourceMap(filePath, code) {
	let sourceMap = convertSourceMap.fromSource(code);

	if (!sourceMap) {
		const dirPath = path.dirname(filePath);
		sourceMap = convertSourceMap.fromMapFileSource(code, dirPath);
	}

	return sourceMap ? sourceMap.toObject() : undefined;
}

function enableParserPlugins(api) {
	api.assertVersion(7);

	return {
		name: 'ava-babel-pipeline-enable-parser-plugins',
		manipulateOptions(_, parserOpts) {
			parserOpts.plugins.push(
				'asyncGenerators',
				'bigInt',
				'classPrivateProperties',
				'classProperties',
				'dynamicImport',
				'numericSeparator',
				'objectRestSpread',
				'optionalCatchBinding'
			);
		}
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

// Assume the stage-4 preset is wanted if there are `babelOptions`, but there is
// no declaration of a stage-` preset that comes with `false` for its options.
//
// Ideally we'd detect the stage-4 preset anywhere in the configuration
// hierarchy, but Babel's loadPartialConfig() does not return disabled presets.
// See <https://github.com/babel/babel/issues/7920>.
function wantsStage4(babelOptions, projectDir) {
	if (!babelOptions) {
		return false;
	}

	if (!babelOptions.presets) {
		return true;
	}

	const stage4 = require('../stage-4');
	return babelOptions.presets.every(arr => {
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

function hashPartialConfig({babelrc, config, options: {plugins, presets}}, projectDir, pluginAndPresetHashes) {
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

	for (const item of [...plugins, ...presets]) {
		if (!item.file) {
			continue;
		}

		const {file: {resolved: filename}} = item;
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

function createCompileFn({babelOptions, cacheDir, compileEnhancements, projectDir}) {
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
		concordance.serialize(concordance.describe(babelOptions))
	];

	const partialCacheKey = md5Hex(seedInputs);
	const pluginAndPresetHashes = new Map();

	const ensureStage4 = wantsStage4(babelOptions, projectDir);
	const containsStage4 = makeValueChecker('../stage-4');
	const containsTransformTestFiles = makeValueChecker('@ava/babel-preset-transform-test-files');

	const loadOptions = filename => {
		const partialConfig = babel.loadPartialConfig({
			babelrc: false,
			babelrcRoots: [projectDir],
			configFile: false,
			sourceMaps: true,
			...babelOptions,
			cwd: projectDir,
			envName,
			filename,
			sourceFileName: path.relative(projectDir, filename),
			sourceRoot: projectDir
		});

		if (!partialConfig) {
			return {hash: '', options: null};
		}

		const {options: partialOptions} = partialConfig;
		partialOptions.plugins.push(enableParserPlugins);

		if (ensureStage4 && !partialOptions.presets.some(containsStage4)) {
			// Apply last.
			partialOptions.presets.unshift(createConfigItem('../stage-4', 'preset'));
		}

		if (compileEnhancements && !partialOptions.presets.some(containsTransformTestFiles)) {
			// Apply first.
			partialOptions.presets.push(createConfigItem('@ava/babel-preset-transform-test-files', 'preset', {powerAssert: true}));
		}

		const hash = hashPartialConfig(partialConfig, projectDir, pluginAndPresetHashes);
		const options = babel.loadOptions(partialOptions);
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

function installSourceMapSupport(state) {
	sourceMapSupport.install({
		environment: 'node',
		handleUncaughtExceptions: false,
		retrieveSourceMap(url) {
			const precompiled = state[url];
			if (!precompiled) {
				return null;
			}

			try {
				const map = fs.readFileSync(`${precompiled}.map`, 'utf8');
				return {url, map};
			} catch (error) {
				if (error.code === 'ENOENT') {
					return null;
				}

				throw error;
			}
		}
	});
}

function installHook(state) {
	installSourceMapSupport(state);

	installPrecompiler(filename => {
		const precompiled = state[filename];
		return precompiled ?
			fs.readFileSync(precompiled, 'utf8') :
			null;
	});
}

module.exports = ({negotiateProtocol}) => {
	const protocol = negotiateProtocol(['legacy', 'noBabelOutOfTheBox']);
	if (protocol === null) {
		return;
	}

	let enabled = false;
	let validConfig;

	const isEnabled = () => enabled;
	const getExtensions = () => enabled ? [...validConfig.extensions] : [];

	let compileFile;
	const compile = ({cacheDir, testFiles, helperFiles}) => {
		if (!compileFile) {
			compileFile = createCompileFn({
				babelOptions: validConfig.testOptions,
				cacheDir,
				compileEnhancements: validConfig.compileEnhancements,
				projectDir: protocol.projectDir
			});
		}

		const state = {};
		for (const file of [...testFiles, ...helperFiles]) {
			try {
				state[file] = compileFile(file);
			} catch (error) {
				throw Object.assign(error, {file});
			}
		}

		return state;
	};

	if (protocol.identifier === 'legacy') {
		const isValidExtensions = extensions => {
			return Array.isArray(extensions) &&
				extensions.every(ext => typeof ext === 'string' && ext !== '');
		};

		return {
			validateConfig(babelConfig, compileEnhancements, enhancementsOnly) {
				// Never enable when used as the full compilation provider if Babel is disabled.
				if (babelConfig === false && !enhancementsOnly) {
					return;
				}

				// Never enable when both are false.
				if (babelConfig === false && !compileEnhancements) {
					return;
				}

				const defaultOptions = {babelrc: true, configFile: true};

				// Only for the legacy protocol is `validateConfig()` called with a
				// `babelConfig` that is `undefined`.
				if (babelConfig === undefined) {
					validConfig = {
						compileEnhancements,
						extensions: [],
						testOptions: defaultOptions
					};
				} else if (babelConfig === false) {
					validConfig = {
						compileEnhancements,
						extensions: [],
						testOptions: false
					};
				} else {
					if (
						!isPlainObject(babelConfig) ||
						!Object.keys(babelConfig).every(key => key === 'extensions' || key === 'testOptions') ||
						(babelConfig.extensions !== undefined && !isValidExtensions(babelConfig.extensions)) ||
						(babelConfig.testOptions !== undefined && !isPlainObject(babelConfig.testOptions))
					) {
						throw new Error(`Unexpected Babel configuration for AVA. See https://github.com/avajs/ava/blob/v${protocol.ava.version}/docs/recipes/babel.md for allowed values.`);
					}

					const {extensions = [], testOptions} = babelConfig;
					validConfig = {
						compileEnhancements,
						extensions,
						testOptions: {...defaultOptions, ...testOptions}
					};
				}

				enabled = true;
			},

			isEnabled,
			getExtensions,
			compile,
			installHook
		};
	}

	const isValidExtensions = extensions => {
		return Array.isArray(extensions) &&
			extensions.length > 0 &&
			extensions.every(ext => typeof ext === 'string' && ext !== '') &&
			new Set(extensions).size === extensions.length;
	};

	return {
		validateConfig(babelConfig) {
			let valid = false;
			if (babelConfig === true) {
				valid = true;
			} else if (isPlainObject(babelConfig)) {
				const keys = Object.keys(babelConfig);
				if (keys.length === 0) {
					valid = true;
				} else if (keys.every(key => key === 'compileEnhancements' || key === 'extensions' || key === 'testOptions')) {
					valid =
						(babelConfig.compileEnhancements === undefined || typeof babelConfig.compileEnhancements === 'boolean') &&
						(babelConfig.extensions === undefined || isValidExtensions(babelConfig.extensions)) &&
						(babelConfig.testOptions === undefined || babelConfig.testOptions === false || isPlainObject(babelConfig.testOptions));
				}
			}

			if (!valid) {
				throw new Error(`Unexpected Babel configuration for AVA. See https://github.com/avajs/ava/blob/v${protocol.ava.version}/docs/recipes/babel.md for allowed values.`);
			}

			enabled = true;

			const {compileEnhancements = true, extensions = ['js'], testOptions} = babelConfig;
			validConfig = {
				compileEnhancements,
				extensions,
				testOptions: testOptions === false ?
					false :
					{babelrc: true, configFile: true, ...testOptions}
			};
		},

		isEnabled,
		getExtensions,
		compile,
		installHook
	};
};
