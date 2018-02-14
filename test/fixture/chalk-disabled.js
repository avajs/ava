import chalk from 'chalk';
import test from '../..';

test('should not support colors', t => {
	t.false(chalk.enabled);
});
