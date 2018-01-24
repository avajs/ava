'use strict';

// Check if the test is being run without AVA CLI
{
	const path = require('path');
	const chalk = require('chalk');

	const isForked = typeof process.send === 'function';
	if (!isForked) {
		const fp = path.relative('.', process.argv[1]);

		console.log();
		console.error('Test files must be run with the AVA CLI:\n\n    ' + chalk.grey.dim('$') + ' ' + chalk.cyan('ava ' + fp) + '\n');

		process.exit(1); // eslint-disable-line unicorn/no-process-exit
	}
}

const run = require('./test-worker');

const opts = JSON.parse(process.argv[2]);

// Adapter for simplified communication between AVA and worker
const ipcMain = {
	send: (name, data) => {
		process.send({
			name: `ava-${name}`,
			data,
			ava: true
		});
	},
	on: (name, listener) => process.on(name, listener),
	// `process.channel` was added in Node.js 7.1.0, but the channel was available
	// through an undocumented API as `process._channel`.
	ipcChannel: process.channel || process._channel
};

run({
	ipcMain,
	opts,
	isForked: true
});
