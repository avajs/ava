import {chalk} from '../chalk.js';

const colors = {
	get log() {
		return chalk.gray;
	},
	get title() {
		return chalk.bold;
	},
	get error() {
		return chalk.red;
	},
	get skip() {
		return chalk.yellow;
	},
	get todo() {
		return chalk.blue;
	},
	get pass() {
		return chalk.green;
	},
	get duration() {
		return chalk.gray.dim;
	},
	get errorSource() {
		return chalk.gray;
	},
	get errorStack() {
		return chalk.gray;
	},
	get errorStackInternal() {
		return chalk.gray.dim;
	},
	get stack() {
		return chalk.red;
	},
	get information() {
		return chalk.magenta;
	},
};

export default colors;
