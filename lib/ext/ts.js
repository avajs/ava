'use strict';

var fs = require('fs');
var figures = require('figures');

var colors = require('../colors');

var typescript;
try {
	typescript = require('typescript');
} catch (err) {
	throw new Error(colors.error(figures.cross) + ' AVA: `--extensions=ts` require TypeScript to be installed.');
}

var typescriptOptions = {
	module: typescript.ModuleKind.CommonJS,
	target: typescript.ScriptTarget.ES6,
	sourceMap: true,
	inlineSources: true,
	inlineSourceMap: true
};

function register() {
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

function transpile(code, fileName) {
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

module.exports = {
	register,
	transpile
};

