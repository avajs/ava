import {Chalk} from 'chalk'; // eslint-disable-line unicorn/import-style

let chalk = new Chalk(); // eslint-disable-line import-x/no-mutable-exports

export {chalk};

export function set(options) {
	chalk = new Chalk(options);
}
