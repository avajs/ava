import {Chalk} from 'chalk'; // eslint-disable-line unicorn/import-style

let chalk = new Chalk(); // eslint-disable-line import/no-mutable-exports

export {chalk};

let configured = false;
export function set(options) {
	if (configured) {
		throw new Error('Chalk has already been configured');
	}

	configured = true;
	chalk = new Chalk(options);
}
