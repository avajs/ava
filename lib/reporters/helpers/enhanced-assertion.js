var chalk = require('chalk');

function EnhancedAssertion() {
	if (!(this instanceof EnhancedAssertion)) {
		throw new TypeError('Class constructor EnhancedAssertion cannot be invoked without \'new\'');
	}
}

EnhancedAssertion.prototype.error = function (error) {
	if (error.actual && error.expected) {
		return '\n    ' + chalk.red(error.name + ': ' + error.message) + '\n' +
			chalk.green('    + expected') + chalk.red(' - actual') + '\n\n' +
			chalk.red('    -' + error.actual) + '\n' +
			chalk.green('    +' + error.expected);
	}

	return '\n    ' + chalk.red(error.name + ': ' + error.message);
};

module.exports = EnhancedAssertion;
