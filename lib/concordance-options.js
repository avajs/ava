import {inspect} from 'node:util';

import ansiStyles from 'ansi-styles';
import {Chalk} from 'chalk'; // eslint-disable-line unicorn/import-style
import stripAnsi from 'strip-ansi';

import {chalk} from './chalk.js';

const forceColor = new Chalk({level: Math.max(chalk.level, 1)});

const colorTheme = {
	boolean: ansiStyles.yellow,
	circular: forceColor.grey('[Circular]'),
	date: {
		invalid: forceColor.red('invalid'),
		value: ansiStyles.blue,
	},
	diffGutters: {
		actual: forceColor.red('-') + ' ',
		expected: forceColor.green('+') + ' ',
		padding: '  ',
	},
	error: {
		ctor: {open: ansiStyles.grey.open + '(', close: ')' + ansiStyles.grey.close},
		name: ansiStyles.magenta,
	},
	function: {
		name: ansiStyles.blue,
		stringTag: ansiStyles.magenta,
	},
	global: ansiStyles.magenta,
	item: {after: forceColor.grey(',')},
	list: {openBracket: forceColor.grey('['), closeBracket: forceColor.grey(']')},
	mapEntry: {after: forceColor.grey(',')},
	maxDepth: forceColor.grey('…'),
	null: ansiStyles.yellow,
	number: ansiStyles.yellow,
	object: {
		openBracket: forceColor.grey('{'),
		closeBracket: forceColor.grey('}'),
		ctor: ansiStyles.magenta,
		stringTag: {open: ansiStyles.magenta.open + '@', close: ansiStyles.magenta.close},
		secondaryStringTag: {open: ansiStyles.grey.open + '@', close: ansiStyles.grey.close},
	},
	property: {
		after: forceColor.grey(','),
		keyBracket: {open: forceColor.grey('['), close: forceColor.grey(']')},
		valueFallback: forceColor.grey('…'),
	},
	regexp: {
		source: {open: ansiStyles.blue.open + '/', close: '/' + ansiStyles.blue.close},
		flags: ansiStyles.yellow,
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
				close: ansiStyles.black.close + ansiStyles.bgGreen.close,
			},
			delete: {
				open: ansiStyles.bgRed.open + ansiStyles.black.open,
				close: ansiStyles.black.close + ansiStyles.bgRed.close,
			},
			equal: ansiStyles.blue,
			insertLine: {
				open: ansiStyles.green.open,
				close: ansiStyles.green.close,
			},
			deleteLine: {
				open: ansiStyles.red.open,
				close: ansiStyles.red.close,
			},
		},
	},
	symbol: ansiStyles.yellow,
	typedArray: {
		bytes: ansiStyles.yellow,
	},
	undefined: ansiStyles.yellow,
};

const plainTheme = JSON.parse(JSON.stringify(colorTheme), (_name, value) => typeof value === 'string' ? stripAnsi(value) : value);

const theme = chalk.level > 0 ? colorTheme : plainTheme;

const concordanceOptions = {
	// Use Node's object inspection depth, clamped to a minimum of 3
	get maxDepth() {
		return Math.max(3, inspect.defaultOptions.depth);
	},
	theme,
};

export default concordanceOptions;

export const snapshotManager = {theme: plainTheme};
