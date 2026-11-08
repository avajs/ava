import {readB} from './cycle-b.js';

export const value = 42;

export function readA() {
	return readB();
}
