'use strict';
/**
 * AVA File Extension for TypeScript
 * Author: https://github.com/zixia
 */
var fs = require('fs');

var typescript;
try {
	typescript = require('typescript');
} catch (err) {
	console.log('AVA error: `--extensions=ts` require TypeScript to be installed.');
	throw err;
}
var tsnode; // = require('ts-node'); XXX: maybe useful in the future, because ts-node do more than typescript for our case.

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
// const originalJsHandler = require.extensions['.js']
// const tsService = require('ts-node').register()
// const tsnodeTsHandler = require.extensions['.ts']
// const tsnodeTsxHandler = require.extensions['.tsx']
// delete require.extensions['.ts']
// delete require.extensions['.tsx']

function tsnodeRegister() {
	tsnode.register(typescriptOptions);
	// if (require.extensions['.ts']) {
	// 	throw new Error('there has already a register for `ts`')
	// }
	// if (!tsService) {
	// 	throw new Error('no ts service')
	// }
	// require.extensions['.ts'] 	= tsnodeTsHandler
	// require.extensions['.tsx'] 	= tsnodeTsxHandler
}

function tsnodeCompile(code, fileName) {
	const tsService = require('ts-node').register(typescriptOptions);

	if (!tsService) {
		throw new Error('no ts service');
	}

	const result = tsService().compile(code, fileName);
	// console.log(result)
	return result;
}

/**
 *
 * Typescript version
 *
 */

function typescriptRegister() {
	require.extensions['.ts'] = function (module, fileName) {
		var code = fs.readFileSync(fileName, 'utf8');
		var result = typescript.transpileModule(code, {
			fileName,
			compilerOptions: typescriptOptions,
			reportDiagnostics: true
		});
		// console.log('\n\n\n')
		// console.log(result.outputText)
		// console.log('\n\n\n')
		// process.exit(0)
		module._compile(result.outputText, fileName);
	};

	require('source-map-support').install({
		hookRequire: true
	});
}

function typescriptCompile(code, fileName) {
	var result = typescript.transpileModule(code, {
		fileName,
		compilerOptions: typescriptOptions,
		reportDiagnostics: true
	});
	// console.log(result)
	return {
		code: result.outputText,
		map: result.sourceMapText
	};
}

var extTs = {
	register: typescriptRegister,
	compile: typescriptCompile,

	typescriptRegister,
	typescriptCompile,

	tsnodeRegister,
	tsnodeCompile
};

// var extTs = {
// 	register: tsnodeRegister,
// 	compile: tsnodeCompile
// };

module.exports = extTs;
