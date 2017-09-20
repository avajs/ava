'use strict';
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const figures = require('figures');
const configManager = require('hullabaloo-config-manager');
const md5Hex = require('md5-hex');
const makeDir = require('make-dir');
const colors = require('./colors');

function validate(conf) {
	if (conf === undefined || conf === null) {
		conf = 'default';
	}

	// Check for valid babel config shortcuts (can be either `default` or `inherit`)
	const isValidShortcut = conf === 'default' || conf === 'inherit';

	if (!conf || (typeof conf === 'string' && !isValidShortcut)) {
		let message = colors.error(figures.cross);
		message += ' Unexpected Babel configuration for AVA. ';
		message += 'See ' + chalk.underline('https://github.com/avajs/ava#es2017-support') + ' for allowed values.';

		throw new Error(message);
	}

	return conf;
}

const SOURCE = '(AVA) Base Babel config';
const AVA_DIR = path.join(__dirname, '..');

function verifyExistingOptions(verifierFile, baseConfig, cache) {
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
			return verifier.verifyCurrentEnv({sources: fixedSourceHashes}, cache)
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

function resolveOptions(baseConfig, cache, optionsFile, verifierFile) {
	return configManager.fromConfig(baseConfig, {cache})
		.then(result => {
			fs.writeFileSync(optionsFile, result.generateModule());

			return result.createVerifier()
				.then(verifier => {
					fs.writeFileSync(verifierFile, verifier.toBuffer());
					return verifier.cacheKeysForCurrentEnv();
				});
		});
}

function build(projectDir, cacheDir, userOptions, powerAssert) {
	// Compute a seed based on the Node.js version and the project directory.
	// Dependency hashes may vary based on the Node.js version, e.g. with the
	// @ava/stage-4 Babel preset. Sources and dependencies paths are absolute in
	// the generated module and verifier state. Those paths wouldn't necessarily
	// be valid if the project directory changes.
	const seed = md5Hex([process.versions.node, projectDir]);

	// Ensure cacheDir exists
	makeDir.sync(cacheDir);

	// The file names predict where valid options may be cached, and thus should
	// include the seed.
	const optionsFile = path.join(cacheDir, `${seed}.babel-options.js`);
	const verifierFile = path.join(cacheDir, `${seed}.verifier.bin`);

	const baseOptions = {
		babelrc: false,
		presets: [
			['@ava/transform-test-files', {powerAssert}]
		]
	};
	if (userOptions === 'default') {
		baseOptions.presets.unshift('@ava/stage-4');
	}

	const baseConfig = configManager.createConfig({
		dir: AVA_DIR, // Presets are resolved relative to this directory
		hash: md5Hex(JSON.stringify(baseOptions)),
		json5: false,
		options: baseOptions,
		source: SOURCE
	});

	if (userOptions !== 'default') {
		baseConfig.extend(configManager.createConfig({
			dir: projectDir,
			options: userOptions === 'inherit' ?
				{babelrc: true} :
				userOptions,
			source: path.join(projectDir, 'package.json') + '#ava.babel',
			hash: md5Hex(JSON.stringify(userOptions))
		}));
	}

	const cache = configManager.prepareCache();
	return verifyExistingOptions(verifierFile, baseConfig, cache)
		.then(cacheKeys => {
			if (cacheKeys) {
				return cacheKeys;
			}

			return resolveOptions(baseConfig, cache, optionsFile, verifierFile);
		})
		.then(cacheKeys => ({
			getOptions: require(optionsFile).getOptions,
			// Include the seed in the cache keys used to store compilation results.
			cacheKeys: Object.assign({seed}, cacheKeys)
		}));
}

module.exports = {
	validate,
	build
};
