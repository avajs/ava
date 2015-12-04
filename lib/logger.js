'use strict';
var prettyMs = require('pretty-ms');
var figures = require('figures');
var Squeak = require('squeak');
var chalk = require('chalk');
var plur = require('plur');
var log = new Squeak({separator: ' '});
var x = module.exports;

function beautifyStack(stack) {
	var re = /(?:^(?! {4}at\b).{6})|(?:\((?:[A-Z]:)?(?:[\\\/](?:(?!node_modules[\\\/]ava[\\\/])[^:\\\/])+)+:\d+:\d+\))/;
	var found = false;

	return stack.split('\n').filter(function (line) {
		var relevant = re.test(line);
		found = found || relevant;
		return !found || relevant;
	}).join('\n');
}

x._beautifyStack = beautifyStack;

log.type('success', {
	color: 'green',
	prefix: figures.tick
});

log.type('error', {
	color: 'red',
	prefix: figures.cross
});

x.write = log.write.bind(log);
x.writelpad = log.writelpad.bind(log);
x.success = log.success.bind(log);
x.error = log.error.bind(log);

x.test = function (props) {
	if (props.err) {
		log.error(props.title, chalk.red(props.err.message));
		return;
	}

	if (props.skip) {
		log.write('  ' + chalk.cyan('- ' + props.title));
		return;
	}

	// display duration only over a threshold
	var threshold = 100;
	var dur = props.duration > threshold ? chalk.gray.dim(' (' + prettyMs(props.duration) + ')') : '';
	log.success(props.title + dur);
};

x.errors = function (tests) {
	var i = 0;

	tests.forEach(function (test) {
		i++;

		log.writelpad(chalk.red(i + '.', test.title));
		log.writelpad(chalk.red(beautifyStack(test.error.stack)));
		log.write();
	});
};

x.report = function (passed, failed, unhandled, uncaught) {
	if (failed > 0) {
		log.writelpad(chalk.red(failed, plur('test', failed), 'failed'));
	} else {
		log.writelpad(chalk.green(passed, plur('test', passed), 'passed'));
	}

	if (unhandled > 0) {
		log.writelpad(chalk.red(unhandled, 'unhandled', plur('rejection', unhandled)));
	}

	if (uncaught > 0) {
		log.writelpad(chalk.red(uncaught, 'uncaught', plur('exception', uncaught)));
	}
};

var types = {
	rejection: 'Unhandled Rejection',
	exception: 'Uncaught Exception'
};

x.unhandledError = function (type, file, error) {
	log.write(chalk.red(types[type] + ':', file));

	if (error.stack) {
		log.writelpad(chalk.red(beautifyStack(error.stack)));
	} else {
		log.writelpad(chalk.red(JSON.stringify(error)));
	}

	log.write();
};
