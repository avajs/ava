'use strict';
const EventEmitter = require('events');
const stream = require('stream');
const run = require('./test-worker');

// Required to prevent warnings from Node.js, because in single mode each test file
// attaches its own `uncaughtException` and `unhandledRejection` listeners.
process.setMaxListeners(Infinity);

module.exports = opts => {
	// Fake child process
	const ps = new EventEmitter();
	ps.stdout = new stream.PassThrough();
	ps.stderr = new stream.PassThrough();

	// Adapter for simplified communication between AVA and worker
	const ipcMain = new EventEmitter();

	// Incoming message from AVA to worker
	ps.send = data => {
		ipcMain.emit('message', data);
	};

	// Fake IPC channel
	ipcMain.ipcChannel = {
		ref: () => {},
		unref: () => {}
	};

	// Outgoing message from worker to AVA
	ipcMain.send = (name, data) => {
		ps.emit('message', {
			name: `ava-${name}`,
			data,
			ava: true
		});
	};

	// Fake `process.exit()`
	ipcMain.exit = code => {
		ps.emit('exit', code);
	};

	setImmediate(() => {
		run({
			ipcMain,
			opts,
			isForked: false
		});
	});

	return ps;
};
