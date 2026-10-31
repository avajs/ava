import {Chalk} from 'chalk'; // eslint-disable-line unicorn/import-style

let chalk = new Chalk(); // eslint-disable-line import-x/no-mutable-exports

export {chalk};

let isConfigured = false;
export function set(options) {
	if (isConfigured) {
		throw new Error('Chalk has already been configured');
	}

	isConfigured = true;
	chalk = new Chalk(options);
}
