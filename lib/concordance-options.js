'use strict';
const ansiStyles = require('ansi-styles');
const chalk = require('chalk');
const cloneDeepWith = require('lodash.clonedeepwith');
const options = require('./globals').options;

const forceColor = new chalk.constructor({enabled: true});

const colorTheme = {
	boolean: ansiStyles.yellow,
	circular: forceColor.grey('[Circular]'),
	date: {
		invalid: forceColor.red('invalid'),
		value: ansiStyles.blue
	},
	diffGutters: {
		actual: forceColor.red('-') + ' ',
		expected: forceColor.green('+') + ' ',
		padding: '  '
	},
	error: {
		ctor: {open: ansiStyles.grey.open + '(', close: ')' + ansiStyles.grey.close},
		name: ansiStyles.magenta
	},
	function: {
		name: ansiStyles.blue,
		stringTag: ansiStyles.magenta
	},
	global: ansiStyles.magenta,
	item: {after: forceColor.grey(',')},
	list: {openBracket: forceColor.grey('['), closeBracket: forceColor.grey(']')},
	mapEntry: {after: forceColor.grey(',')},
	null: ansiStyles.yellow,
	number: ansiStyles.yellow,
	object: {
		openBracket: forceColor.grey('{'),
		closeBracket: forceColor.grey('}'),
		ctor: ansiStyles.magenta,
		stringTag: {open: ansiStyles.magenta.open + '@', close: ansiStyles.magenta.close},
		secondaryStringTag: {open: ansiStyles.grey.open + '@', close: ansiStyles.grey.close}
	},
	property: {
		after: forceColor.grey(','),
		keyBracket: {open: forceColor.grey('['), close: forceColor.grey(']')},
		valueFallback: forceColor.grey('…')
	},
	regexp: {
		source: {open: ansiStyles.blue.open + '/', close: '/' + ansiStyles.blue.close},
		flags: ansiStyles.yellow
	},
	stats: {separator: forceColor.grey('---')},
	string: {
		open: ansiStyles.blue.open,
		close: ansiStyles.blue.close,
		line: {open: forceColor.blue('\''), close: forceColor.blue('\'')},
		multiline: {start: forceColor.blue('`'), end: forceColor.blue('`')},
		controlPicture: ansiStyles.grey,
		diff: {
			insert: {
				open: ansiStyles.bgGreen.open + ansiStyles.black.open,
				close: ansiStyles.black.close + ansiStyles.bgGreen.close
			},
			delete: {
				open: ansiStyles.bgRed.open + ansiStyles.black.open,
				close: ansiStyles.black.close + ansiStyles.bgRed.close
			},
			equal: ansiStyles.blue,
			insertLine: {
				open: ansiStyles.green.open,
				close: ansiStyles.green.close
			},
			deleteLine: {
				open: ansiStyles.red.open,
				close: ansiStyles.red.close
			}
		}
	},
	symbol: ansiStyles.yellow,
	typedArray: {
		bytes: ansiStyles.yellow
	},
	undefined: ansiStyles.yellow
};

const plainTheme = cloneDeepWith(colorTheme, value => {
	if (typeof value === 'string') {
		return chalk.stripColor(value);
	}
});

const theme = options.color === false ? plainTheme : colorTheme;
exports.default = {theme};
exports.snapshotManager = {theme: plainTheme};
