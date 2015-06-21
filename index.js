'use strict';
var chalk = require('chalk');
var figures = require('figures');
var Squeak = require('squeak');
var plur = require('plur');
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
 * Show stack for each failed test
 *
 * @param {Array} results
 * @api private
 */

function stack(results) {
	var i = 0;

	results.forEach(function (result) {
		if (!result.error) {
			return;
		}

		i++;

		log.writelpad(chalk.red(i + '.', result.title));
		log.writelpad(chalk.red(result.error.stack));
		log.write();
	});
}

/**
 * Show summary and exit
 *
 * @param {Object} stats
 * @param {Array} results
 * @api private
 */

function exit(stats, results) {
	if (stats.testCount > 0) {
		log.write();
	}

	if (stats.failCount === 0) {
		log.writelpad(chalk.green(stats.passCount, plur('test', stats.passCount), 'passed'));
	} else {
		log.writelpad(chalk.red(stats.failCount, plur('test', stats.failCount), 'failed'));
	}

	log.write();

	if (stats.failCount > 0) {
		stack(results);
	}

	process.exit(stats.failCount > 0 ? 1 : 0);
}

setImmediate(function () {
	runner.on('test', test);
	runner.run(exit);
});

module.exports = runner.addTest.bind(runner);
module.exports.serial = runner.addSerialTest.bind(runner);
