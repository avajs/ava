'use strict';
const timers = require('timers');

Object.assign(exports, timers);
exports.now = Date.now;
