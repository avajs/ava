import {EventEmitter} from 'node:events';

import {Chalk} from 'chalk'; // eslint-disable-line unicorn/import-style

let chalk = new Chalk(); // eslint-disable-line import/no-mutable-exports

export {chalk};

let configured = false;
const events = new EventEmitter();
const on = events.on.bind(events);
const emit = events.emit.bind(events);
export function set(options) {
	if (configured) {
		throw new Error('Chalk has already been configured');
	}

	configured = true;
	chalk = new Chalk(options);
	emit('set', chalk);
}

export {on};
