'use strict';
const process = require('node:process');
const {isMainThread} = require('node:worker_threads');

exports.isRunningInThread = isMainThread === false;
exports.isRunningInChildProcess = typeof process.send === 'function';
