import chalk from 'chalk';

let instance = new chalk.Instance(); // eslint-disable-line import/no-mutable-exports
export default instance;

export {instance as chalk};

let configured = false;
export function set(options) {
	if (configured) {
		throw new Error('Chalk has already been configured');
	}

	configured = true;
	instance = new chalk.Instance(options);
}
