'use strict';
var chalk = require('chalk');
var logSymbols = require('log-symbols');
var Runner = require('./lib/runner');
var runner = new Runner();

setImmediate(function () {
	console.log('\n');

	runner.on('test', function (err, title) {
		if (err) {
			console.log(' ', logSymbols.error, title, ' ', chalk.red(err.message));
			return;
		}

		console.log(' ', logSymbols.success, title);
	});

	runner.run(function (stats, results) {
		if (stats.failCount === 0) {
			console.log(chalk.green('\n ', stats.passCount, (stats.passCount === 1 ? 'test' : 'tests'), 'passed\n'));
		} else {
			console.log(chalk.red('\n ', stats.failCount, (stats.failCount === 1 ? 'test' : 'tests'), 'failed\n'));
			// TODO: show detailed fails when at least one test failed
		}

		console.log('runner run cb', arguments);
		process.exit(stats.failCount > 0 ? 1 : 0);
	});
});

module.exports = runner.addTest.bind(runner);

// TODO: expose it when more stable
//module.exports.Runner = Runner;
