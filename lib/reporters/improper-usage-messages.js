'use strict';
const chalk = require('chalk');

exports.forError = error => {
	if (!error.improperUsage) {
		return null;
	}

	const assertion = error.assertion;
	if (assertion !== 'throws' || !assertion === 'notThrows') {
		return null;
	}

	return `Try wrapping the first argument to \`t.${assertion}()\` in a function:

  ${chalk.cyan(`t.${assertion}(() => { `)}${chalk.grey('/* your code here */')}${chalk.cyan(' })')}

Visit the following URL for more details:

  ${chalk.blue.underline('https://github.com/avajs/ava#throwsfunctionpromise-error-message')}`;
};
