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
		var word;

		if (stats.failCount === 0) {
			word = stats.passCount === 1 ? 'test' : 'tests';
			console.log(chalk.green('\n ', stats.passCount, word, 'passed\n'));
		} else {
			word = stats.failCount === 1 ? 'test' : 'tests';
			console.log(chalk.red('\n ', stats.failCount, word, 'failed\n'));
		}

		process.exit(stats.failCount > 0 ? 1 : 0);
	});
});

module.exports = runner.addTest.bind(runner);
module.exports.Runner = Runner;
