'use strict';
const runner = require('./subprocess').getRunner();

const makeCjsExport = (chain = runner.chain) => {
	function test(...args) {
		return chain(...args);
	}

	return Object.assign(test, chain);
};

// Support CommonJS modules by exporting a test function that can be fully
// chained. Also support ES module loaders by exporting __esModule and a
// default.
exports.ava3 = () => Object.assign(makeCjsExport(), {
	__esModule: true,
	default: makeCjsExport()
});

// Only export a test function that can be fully chained. This will be the
// behavior in AVA 4.
exports.experimental = () => {
	if (!runner.experimentalChain) {
		throw new Error('You must enable the ’experimentalTestInterfaces’ experiment');
	}

	return makeCjsExport(runner.experimentalChain);
};
