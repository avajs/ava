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

module.exports = duration;
