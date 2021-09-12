'use strict';
const process = require('process');
const {isMainThread} = require('worker_threads');

exports.isRunningInThread = isMainThread === false;
exports.isRunningInChildProcess = typeof process.send === 'function';
