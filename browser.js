'use strict';

var arrify = require('arrify');
var globals = require('./lib/globals');
var Api = require('./api');

var state = require('./state');
var files = state.files;
var conf = state.conf;
var cli = state.cli;

var api = new Api({
	failFast: cli.flags.failFast,
	serial: cli.flags.serial,
	babelEnabled: false,
	cacheEnabled: false,
	explicitTitles: false,
	match: arrify(cli.flags.match),
	babelConfig: conf.babel,
	timeout: cli.flags.timeout,
	concurrency: cli.flags.concurrency ? parseInt(cli.flags.concurrency, 10) : 0
});

api.on('test-run', function (runStatus) {
	runStatus.on('test', function (test) {
		console.log('test');
		console.log(test);
	});

	// runStatus.on('error', logger.unhandledError);

	// runStatus.on('stdout', logger.stdout);
	// runStatus.on('stderr', logger.stderr);
});

api.run(files)
	.then(function (runStatus) {
		console.log('finish');
		console.log(runStatus);
		// logger.finish(runStatus);
		// logger.exit(runStatus.failCount > 0 || runStatus.rejectionCount > 0 || runStatus.exceptionCount > 0 ? 1 : 0);
	})
	.catch(function (err) {
		// Don't swallow exceptions. Note that any expected error should already
		// have been logged.
		globals.setImmediate(function () {
			throw err;
		});
	});
