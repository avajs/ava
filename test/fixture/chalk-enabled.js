import chalk from 'chalk';
import test from '../../';

test('should support colors', t => {
	t.true(chalk.enabled);
});
