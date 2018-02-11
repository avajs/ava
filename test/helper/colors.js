/**
 * This module is maintained to promote separation between the tests and the
 * implementation.
 */
'use strict';

const ansiStyles = require('ansi-styles');

function make(name) {
	const style = ansiStyles[name];
	return function (string) {
		return style.open + string + style.close;
	};
}
const bold = make('bold');
const white = make('white');
const gray = make('gray');

// The following color definitions are contextual so that they produce expected
// values which mimic the behavior of the Chalk library.
const isSimpleWindowsTerm = process.platform === 'win32' && !(process.env.TERM || '').toLowerCase().startsWith('xterm');
const openDim = isSimpleWindowsTerm ? '' : ansiStyles.dim.open;
const openBlue = isSimpleWindowsTerm ? '\u001B[94m' : ansiStyles.blue.open;
// "Use `bold` by default on Windows"
// https://github.com/chalk/chalk/issues/36
const blue = string => openBlue + string + ansiStyles.blue.close;
// "(Windows) chalk.gray.dim not visible"
// https://github.com/chalk/chalk/issues/58
const dimGray = string => gray(openDim + string + ansiStyles.dim.close);

module.exports = {
	blue,
	boldWhite: string => bold(white(string)),
	dimGray,
	gray,
	green: make('green'),
	magenta: make('magenta'),
	red: make('red'),
	yellow: make('yellow')
};
