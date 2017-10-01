'use strict';

const StackUtils = require('stack-utils'); // eslint-disable-line import/no-extraneous-dependencies

const original = StackUtils.prototype.parseLine;
let restored = false;
let restoreAfterFirstCall = false;
StackUtils.prototype.parseLine = function (line) {
	if (restored) {
		return original.call(this, line);
	}
	if (restoreAfterFirstCall) {
		restored = true;
	}
	throw new Error('Forced error');
};

exports.restoreAfterFirstCall = () => {
	restoreAfterFirstCall = true;
};
