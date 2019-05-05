'use strict';
const timers = require('timers');

exports = Object.assign(exports, {timers});
exports.timers.now = Date.now;

const json = {parse: JSON.parse, stringify: JSON.stringify};
exports = Object.assign(exports, {json});

