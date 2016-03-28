'use strict';
var Test = require('./test');

module.exports = Hook;

function Hook(title, fn) {
	if (!(this instanceof Hook)) {
		throw new TypeError('Class constructor Hook cannot be invoked without \'new\'');
	}

	if (typeof title === 'function') {
		fn = title;
		title = null;
	}

	this.title = title;
	this.fn = fn;
}

Hook.prototype.test = function (testTitle) {
	var title = this.title || (this.metadata.type + ' for "' + testTitle + '"');
	var test = new Test(title, this.fn);

	test.metadata = this.metadata;

	return test;
};
