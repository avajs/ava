'use strict';
var path = require('path');
var resolveFrom = require('resolve-from');
var createEspowerPlugin = require('babel-plugin-espower/create');
var requireFromString = require('require-from-string');

var hasGenerators = parseInt(process.version.slice(1), 10) > 0;
var testPath = process.argv[2];
var testDir = path.dirname(testPath);
var Module = module.constructor;
var babel;

try {
	var localBabel = resolveFrom('.', 'babel-core') || resolveFrom('.', 'babel');
	babel = require(localBabel);
} catch (err) {
	babel = require('babel-core');
}

function options() {
	return {
		blacklist: hasGenerators ? ['regenerator'] : [],
		optional: hasGenerators ? ['asyncToGenerator', 'runtime'] : ['runtime'],
		plugins: [
			createEspowerPlugin(babel, {
				patterns: require('./enhance-assert').PATTERNS
			})
		]
	};
}

// TODO: This needs to be smarter.
function shouldTranspile(filePath) {
	var fileName = path.basename(filePath);
	return testDir === path.dirname(filePath) && fileName[0] === '_' || filePath === testPath;
}

function requireHook(file) {
	// Most of this is Module._load with a few modifications.

	file = Module._resolveFilename(file, this);

	var cachedModule = Module._cache[file];
	if (cachedModule) {
		return cachedModule.exports;
	}

	if (shouldTranspile(file)) {
		var code = babel.transformFileSync(file, options()).code;

		var hadException = true;

		var m = requireFromString.load(file, {
			appendPaths: module.paths,
			require: requireHook
		});

		try {
			Module._cache[file] = m;

			m._compile(code, file);

			hadException = false;
		} finally {
			if (hadException) {
				delete Module._cache[file];
			}
		}

		return m.exports;
	}
	return Module._load(file, this);
}

requireHook.call(module, testPath);

process.on('message', function (message) {
	if (message['ava-kill-command']) {
		process.exit(0);
	}
});

