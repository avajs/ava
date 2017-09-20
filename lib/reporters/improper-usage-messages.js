'use strict';
const chalk = require('chalk');

exports.forError = error => {
	if (!error.improperUsage) {
		return null;
	}

	const assertion = error.assertion;
	if (assertion === 'throws' || assertion === 'notThrows') {
		return `Try wrapping the first argument to \`t.${assertion}()\` in a function:

  ${chalk.cyan(`t.${assertion}(() => { `)}${chalk.grey('/* your code here */')}${chalk.cyan(' })')}

Visit the following URL for more details:

  ${chalk.blue.underline('https://github.com/avajs/ava#throwsfunctionpromise-error-message')}`;
	} else if (assertion === 'snapshot') {
		const name = error.improperUsage.name;
		const snapPath = error.improperUsage.snapPath;

		if (name === 'ChecksumError') {
			return `The snapshot file is corrupted.

File path: ${chalk.yellow(snapPath)}

Please run AVA again with the ${chalk.cyan('--update-snapshots')} flag to recreate it.`;
		}

		if (name === 'LegacyError') {
			return `The snapshot file was created with AVA 0.19. It's not supported by this AVA version.

File path: ${chalk.yellow(snapPath)}

Please run AVA again with the ${chalk.cyan('--update-snapshots')} flag to upgrade.`;
		}

		if (name === 'VersionMismatchError') {
			const snapVersion = error.improperUsage.snapVersion;
			const expectedVersion = error.improperUsage.expectedVersion;
			const upgradeMessage = snapVersion < expectedVersion ?
				`Please run AVA again with the ${chalk.cyan('--update-snapshots')} flag to upgrade.` :
				'You should upgrade AVA.';

			return `The snapshot file is v${snapVersion}, but only v${expectedVersion} is supported.

File path: ${chalk.yellow(snapPath)}

${upgradeMessage}`;
		}
	}

	return null;
};
