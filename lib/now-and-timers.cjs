'use strict';
const timers = require('timers');

// Slightly higher than 24 days
const MAX_INT32 = Math.pow(2, 31) - 1;

const setSafeTimeout = (callback, ms) => {
    const avaliableMs = ms < MAX_INT32 ? ms : MAX_INT32;

    return timers.setTimeout(callback, avaliableMs)
}

Object.assign(exports, timers, { setSafeTimeout });
exports.now = Date.now;
