/**
 * This module is maintained to promote separation between the tests and the
 * implementation.
 */
'use strict';

const ansiStyles = require('ansi-styles');

function make(name) {
	const style = ansiStyles[name];
	return function(string) {
		return style.open + string + style.close;
	};
}
const bold = make('bold');
const white = make('white');
const dim = make('dim');
const gray = make('gray');

module.exports = {
	blue: make('blue'),
	boldWhite: (string) => bold(white(string)),
	dimGray: (string) => gray(dim(string)),
	gray: make('gray'),
	green: make('green'),
	magenta: make('magenta'),
	red: make('red'),
	yellow: make('yellow')
};
