import {chalk} from '../chalk.js';
import pkg from '../pkg.cjs';

export default function buildMessage(error) {
	if (!error.improperUsage) {
		return null;
	}

	const {assertion} = error;
	if (assertion === 'throws' || assertion === 'notThrows') {
		return `Try wrapping the first argument to \`t.${assertion}()\` in a function:

  ${chalk.cyan(`t.${assertion}(() => { `)}${chalk.grey('/* your code here */')}${chalk.cyan(' })')}

Visit the following URL for more details:

  ${chalk.blue.underline(`https://github.com/avajs/ava/blob/v${pkg.version}/docs/03-assertions.md#throwsfn-expected-message`)}`;
	}

	if (assertion === 'snapshot') {
		const {name, snapPath} = error.improperUsage;

		if (name === 'ChecksumError' || name === 'InvalidSnapshotError') {
			return `The snapshot file is corrupted.

File path: ${chalk.yellow(snapPath)}

Please run AVA again with the ${chalk.cyan('--update-snapshots')} flag to recreate it.`;
		}

		if (name === 'LegacyError') {
			return `The snapshot file was created with AVA 0.19. It’s not supported by this AVA version.

File path: ${chalk.yellow(snapPath)}

Please run AVA again with the ${chalk.cyan('--update-snapshots')} flag to upgrade.`;
		}

		if (name === 'VersionMismatchError') {
			const {snapVersion, expectedVersion} = error.improperUsage;
			const upgradeMessage = snapVersion < expectedVersion
				? `Please run AVA again with the ${chalk.cyan('--update-snapshots')} flag to upgrade.`
				: 'You should upgrade AVA.';

			return `The snapshot file is v${snapVersion}, but only v${expectedVersion} is supported.

File path: ${chalk.yellow(snapPath)}

${upgradeMessage}`;
		}
	}

	return null;
}
