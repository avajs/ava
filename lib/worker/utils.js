'use strict';

const {isMainThread} = require('worker_threads');

Object.defineProperty(exports, 'isRunningInThread', {
	enumerable: true,
	writable: false,
	value: isMainThread === false
});

Object.defineProperty(exports, 'isRunningInChildProcess', {
	enumerable: true,
	writable: false,
	value: typeof process.send === 'function'
});
