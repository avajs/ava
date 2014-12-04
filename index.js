'use strict';
var chalk = require('chalk');
var figures = require('figures');
var Squeak = require('squeak');
var Runner = require('./lib/runner');
var log = new Squeak({separator: ' '});
var runner = new Runner();

/**
 * Add log types
 */

log.type('success', {
	color: 'green',
	prefix: figures.tick
});

log.type('error', {
	color: 'red',
	prefix: figures.cross
});

/**
 * Handle test
 *
 * @param {Object} err
 * @param {String} title
 * @api private
 */

function test(err, title) {
	if (err) {
		log.error(title, chalk.red(err.message));
		return;
	}

	log.success(title);
}

/**
 * Show summary and exit
 *
 * @param {Object} stats
 * @param {Object} results
 * @api private
 */

function exit(stats, results) {
	var word;
	log.write();

	if (stats.failCount === 0) {
		word = stats.passCount === 1 ? 'test' : 'tests';
		log.writelpad(chalk.green(stats.passCount, word, 'passed'));
	} else {
		word = stats.failCount === 1 ? 'test' : 'tests';
		log.writelpad(chalk.red(stats.failCount, word, 'failed'));
	}

	process.exit(stats.failCount > 0 ? 1 : 0);
}

setImmediate(function () {
	runner.on('test', test);
	runner.run(exit);
});

module.exports = runner.addTest.bind(runner);
