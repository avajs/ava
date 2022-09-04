'use strict';
const timers = require('timers');

// Slightly higher than 24 days
const MAX_INT32 = (2 ** 31) - 1;

const setSafeTimeout = (callback, ms) => {
	const allowedMs = Math.min(ms, MAX_INT32);

	return timers.setTimeout(callback, allowedMs);
};

Object.assign(exports, timers);

exports.now = Date.now;
exports.setSafeTimeout = setSafeTimeout;
