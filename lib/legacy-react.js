'use strict';
const ansiStyles = require('ansi-styles');
const reactPlugin = require('@concordance/react');
const chalk = require('./chalk').get();

const forceColor = new chalk.Instance({level: Math.max(chalk.level, 1)});

module.exports = {
	...reactPlugin,
	name: 'ava-plugin-react',
	themeOverride: {
		react: {
			functionType: forceColor.grey('\u235F'),
			openTag: {
				start: forceColor.grey('<'),
				end: forceColor.grey('>'),
				selfClose: forceColor.grey('/'),
				selfCloseVoid: ' ' + forceColor.grey('/')
			},
			closeTag: {
				open: forceColor.grey('</'),
				close: forceColor.grey('>')
			},
			tagName: ansiStyles.magenta,
			attribute: {
				separator: '=',
				value: {
					openBracket: forceColor.grey('{'),
					closeBracket: forceColor.grey('}'),
					string: {
						line: {open: forceColor.blue('"'), close: forceColor.blue('"'), escapeQuote: '"'}
					}
				}
			},
			child: {
				openBracket: forceColor.grey('{'),
				closeBracket: forceColor.grey('}')
			}
		}
	}
};
