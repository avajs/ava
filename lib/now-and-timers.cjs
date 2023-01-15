'use strict';
const timers = require('node:timers');

Object.assign(exports, timers);
exports.now = Date.now;

// Any delay larger than this value is ignored by Node.js, with a delay of `1`
// used instead. See <https://nodejs.org/api/timers.html#settimeoutcallback-delay-args>.
const MAX_DELAY = (2 ** 31) - 1;

function setCappedTimeout(callback, delay) {
	const safeDelay = Math.min(delay, MAX_DELAY);
	return timers.setTimeout(callback, safeDelay);
}

exports.setCappedTimeout = setCappedTimeout;
