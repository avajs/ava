'use strict';
const worker = require('./test-worker');
const Runner = require('./runner');
const opts = require('./worker-options').get();

const runner = new Runner({
	failFast: opts.failFast,
	failWithoutAssertions: opts.failWithoutAssertions,
	file: opts.file,
	match: opts.match,
	projectDir: opts.projectDir,
	runOnlyExclusive: opts.runOnlyExclusive,
	serial: opts.serial,
	snapshotDir: opts.snapshotDir,
	updateSnapshots: opts.updateSnapshots
});

worker.setRunner(runner);

const makeCjsExport = () => {
	function test() {
		return runner.chain.apply(null, arguments);
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
	default: runner.chain,
	test: runner.chain
});
