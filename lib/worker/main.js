'use strict';
const runner = require('./subprocess').getRunner();

const makeCjsExport = () => {
	function test(...args) {
		return runner.chain(...args);
	}

	return Object.assign(test, runner.chain);
};

// Support CommonJS modules by exporting a test function that can be fully
// chained. Also support ES module loaders by exporting __esModule and a
// default.
module.exports = Object.assign(makeCjsExport(), {
	__esModule: true,
	default: runner.chain
});
