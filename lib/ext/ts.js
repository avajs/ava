'use strict';
var fs = require('fs');

var typescript;
try {
	typescript = require('typescript');
} catch (err) {
	console.error('AVA: `--extensions=ts` require TypeScript to be installed.');
	throw err;
}

var typescriptOptions = {
	module: typescript.ModuleKind.CommonJS,
	target: typescript.ScriptTarget.ES6,
	sourceMap: true,
	inlineSources: true,
	inlineSourceMap: true
};

/**
 *
 * Ts-Node version
 *
 */
function tsnodeRegister() {
	try {
		require('ts-node').register(typescriptOptions);
	} catch (err) {
		console.log('AVA error: `--extensions=ts` require ts-node to be installed.');
		throw err;
	}
}

function tsnodeTranspile(code, fileName) {
	try {
		const tsService = require('ts-node').register(typescriptOptions);
		const result = tsService().compile(code, fileName);
		return result;
	} catch (err) {
		console.log('AVA error: `--extensions=ts` require ts-node to be installed.');
		throw err;
	}
}

function typescriptRegister() {
	require.extensions['.ts'] = function (module, fileName) {
		var code = fs.readFileSync(fileName, 'utf8');
		var result = typescript.transpileModule(code, {
			fileName,
			compilerOptions: typescriptOptions,
			reportDiagnostics: true
		});
		module._compile(result.outputText, fileName);
	};

	require('source-map-support').install({
		hookRequire: true
	});
}

function typescriptTranspile(code, fileName) {
	var result = typescript.transpileModule(code, {
		fileName,
		compilerOptions: typescriptOptions,
		reportDiagnostics: true
	});
	return {
		code: result.outputText,
		map: result.sourceMapText
	};
}

module.exports = module.exports.default = {
	register: typescriptRegister,
	transpile: typescriptTranspile,

	typescriptRegister,
	typescriptTranspile,

	tsnodeRegister,
	tsnodeTranspile
};

