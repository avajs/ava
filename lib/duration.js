'use strict';

var second = 1000;
var minute = 60 * second;
var hour = 60 * minute;
var day = 24 * hour;

function round(value) {
	return Number(Math.round(value * 1000) / 1000);
}

function duration(ms) {
	if (ms >= day) {
		return round(ms / day) + 'd';
	}

	if (ms >= hour) {
		return round(ms / hour) + 'h';
	}

	if (ms >= minute) {
		return round(ms / minute) + 'm';
	}

	if (ms >= second) {
		return round(ms / second) + 's';
	}

	return round(ms) + 'ms';
}

function hrtimeToDuration(hrtime) {
	return duration(((hrtime[0] * 1e6) + (hrtime[1] / 1e3)) / 1e3);
}

module.exports = exports = hrtimeToDuration;

// exposed for testing purposes
exports.duration = duration;
