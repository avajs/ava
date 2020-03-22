'use strict';
const util = require('util');
const ansiStyles = require('ansi-styles');
const stripAnsi = require('strip-ansi');
const cloneDeepWith = require('lodash/cloneDeepWith');
const merge = require('lodash/merge');
const chalk = require('./chalk').get();

const forceColor = new chalk.Instance({level: Math.max(chalk.level, 1)});

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
	maxDepth: forceColor.grey('…'),
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

let resolved = null;
exports.resolve = () => {
	if (!resolved) {
		throw new Error('Concordance options have not yet been configured');
	}

	return resolved;
};

exports.configure = plugins => {
	if (resolved) {
		throw new Error('Concordance options have already been configured');
	}

	// TODO: Remove in the next major release.
	if (plugins === undefined) {
		const avaReactPlugin = require('./legacy-react');

		plugins = [avaReactPlugin];
	} else {
		// TODO: Resolve plugins
	}

	const resolvedTheme = plugins.reduce((theme, {themeOverride}) => {
		return merge(theme, themeOverride);
	}, colorTheme);

	const plainTheme = cloneDeepWith(resolvedTheme, value => {
		if (typeof value === 'string') {
			return stripAnsi(value);
		}
	});

	const theme = chalk.level > 0 ? resolvedTheme : plainTheme;

	plugins = plugins.map(({themeOverride: _, ...plugin}) => plugin);

	resolved = {
		default: {
		// Use Node's object inspection depth, clamped to a minimum of 3
			get maxDepth() {
				return Math.max(3, util.inspect.defaultOptions.depth);
			},
			plugins,
			theme
		},

		diff: {maxDepth: 1, plugins, theme},
		snapshotManager: {plugins, theme: plainTheme}
	};
};

