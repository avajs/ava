'use strict';
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const figures = require('figures');
const configManager = require('hullabaloo-config-manager');
const md5Hex = require('md5-hex');
const makeDir = require('make-dir');
const colors = require('./colors');

const stage4Path = require.resolve('../stage-4');
const syntaxAsyncGeneratorsPath = require.resolve('@babel/plugin-syntax-async-generators');
const syntaxObjectRestSpreadPath = require.resolve('@babel/plugin-syntax-object-rest-spread');
const transformTestFilesPath = require.resolve('@ava/babel-preset-transform-test-files');

function validate(conf) {
	if (conf === false) {
		return null;
	}

	if (conf === undefined) {
		return {testOptions: {}};
	}

	if (!conf || typeof conf !== 'object' || !conf.testOptions || typeof conf.testOptions !== 'object' || Array.isArray(conf.testOptions) || Object.keys(conf).length > 1) {
		throw new Error(`${colors.error(figures.cross)} Unexpected Babel configuration for AVA. See ${chalk.underline('https://github.com/avajs/ava/blob/master/docs/recipes/babel.md')} for allowed values.`);
	}

	return conf;
}

function verifyExistingOptions(verifierFile, baseConfig, cache, envName) {
	return new Promise((resolve, reject) => {
		try {
			resolve(fs.readFileSync(verifierFile));
		} catch (err) {
			if (err && err.code === 'ENOENT') {
				resolve(null);
			} else {
				reject(err);
			}
		}
	})
		.then(buffer => {
			if (!buffer) {
				return null;
			}

			const verifier = configManager.restoreVerifier(buffer);
			const fixedSourceHashes = new Map();
			fixedSourceHashes.set(baseConfig.source, baseConfig.hash);
			if (baseConfig.extends) {
				fixedSourceHashes.set(baseConfig.extends.source, baseConfig.extends.hash);
			}
			return verifier.verifyEnv(envName, {sources: fixedSourceHashes}, cache)
				.then(result => {
					if (!result.cacheKeys) {
						return null;
					}

					if (result.dependenciesChanged) {
						fs.writeFileSync(verifierFile, result.verifier.toBuffer());
					}

					return result.cacheKeys;
				});
		});
}

function resolveOptions(baseConfig, cache, envName, optionsFile, verifierFile) { // eslint-disable-line max-params
	return configManager.fromConfig(baseConfig, {cache, expectedEnvNames: [envName]})
		.then(result => {
			fs.writeFileSync(optionsFile, result.generateModule());

			return result.createVerifier()
				.then(verifier => {
					fs.writeFileSync(verifierFile, verifier.toBuffer());
					return verifier.cacheKeysForEnv(envName);
				});
		});
}

function build(projectDir, cacheDir, userOptions, compileEnhancements) {
	if (!userOptions && !compileEnhancements) {
		return Promise.resolve(null);
	}

	// Note that Babel ignores empty string values, even for NODE_ENV. Here
	// default to 'test' unless NODE_ENV is defined, in which case fall back to
	// Babel's default of 'development' if it's empty.
	const envName = process.env.BABEL_ENV || ('NODE_ENV' in process.env ? process.env.NODE_ENV : 'test') || 'development';

	// Compute a seed based on the Node.js version and the project directory.
	// Dependency hashes may vary based on the Node.js version, e.g. with the
	// @ava/stage-4 Babel preset. Sources and dependencies paths are absolute in
	// the generated module and verifier state. Those paths wouldn't necessarily
	// be valid if the project directory changes.
	// Also include `envName`, so options can be cached even if users change
	// BABEL_ENV or NODE_ENV between runs.
	const seed = md5Hex([process.versions.node, projectDir, envName]);

	// Ensure cacheDir exists
	makeDir.sync(cacheDir);

	// The file names predict where valid options may be cached, and thus should
	// include the seed.
	const optionsFile = path.join(cacheDir, `${seed}.babel-options.js`);
	const verifierFile = path.join(cacheDir, `${seed}.verifier.bin`);

	const baseOptions = {
		babelrc: false,
		plugins: [
			// TODO: Remove once Babel can parse this syntax unaided.
			syntaxAsyncGeneratorsPath,
			syntaxObjectRestSpreadPath
		],
		presets: []
	};

	if (userOptions) {
		// Always apply the stage-4 preset.
		baseOptions.presets.push(stage4Path);

		// By default extend the project's Babel configuration, but allow this to be
		// disabled through userOptions.
		if (userOptions.testOptions.babelrc !== false) {
			baseOptions.babelrc = true;
		}
		if (userOptions.testOptions.extends) {
			baseOptions.extends = userOptions.testOptions.extends;
		}
	}

	const baseConfig = configManager.createConfig({
		dir: projectDir,
		fileType: 'JSON',
		hash: md5Hex(JSON.stringify(baseOptions)),
		options: baseOptions,
		source: '(AVA) baseConfig'
	});

	let intermediateConfig = baseConfig;
	if (userOptions && Object.keys(userOptions.testOptions).length > 0) {
		// At this level, babelrc *must* be false.
		const options = Object.assign({}, userOptions.testOptions, {babelrc: false});
		// Any extends option has been applied in baseConfig.
		delete options.extends;
		intermediateConfig = configManager.createConfig({
			dir: projectDir,
			fileType: 'JSON',
			hash: md5Hex(JSON.stringify(options)),
			options,
			source: path.join(projectDir, 'package.json') + '#ava.babel'
		});
		intermediateConfig.extend(baseConfig);
	}

	let finalConfig = intermediateConfig;
	if (compileEnhancements) {
		finalConfig = configManager.createConfig({
			dir: projectDir,
			fileType: 'JSON',
			hash: '', // This is deterministic, so no actual value necessary.
			options: {
				babelrc: false,
				presets: [
					[transformTestFilesPath, {powerAssert: true}]
				]
			},
			source: '(AVA) compileEnhancements'
		});
		finalConfig.extend(intermediateConfig);
	}

	const cache = configManager.prepareCache();
	return verifyExistingOptions(verifierFile, finalConfig, cache, envName)
		.then(cacheKeys => {
			if (cacheKeys) {
				return cacheKeys;
			}

			return resolveOptions(finalConfig, cache, envName, optionsFile, verifierFile);
		})
		.then(cacheKeys => {
			const getOptions = require(optionsFile).getOptions;
			return {
				getOptions() {
					return getOptions(envName, cache);
				},
				// Include the seed in the cache keys used to store compilation results.
				cacheKeys: Object.assign({seed}, cacheKeys)
			};
		});
}

module.exports = {
	validate,
	build
};
