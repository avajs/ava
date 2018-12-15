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
// default. Support `import * as ava from 'ava'` use cases by exporting a
// `test` member. Do all this whilst preventing `test.test.test() or
// `test.default.test()` chains, though in CommonJS `test.test()` is
// unavoidable.
module.exports = Object.assign(makeCjsExport(), {
	__esModule: true,
	default: runner.chain
});
