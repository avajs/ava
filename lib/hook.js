var Test = require('./test');

module.exports = Hook;

function Hook(type, title, fn) {
	if (!(this instanceof Hook)) {
		return new Hook(type, title, fn);
	}

	if (typeof title === 'function') {
		fn = title;
		title = null;
	}

	this.type = type;
	this.title = title;
	this.fn = fn;
}

Hook.prototype.test = function (testTitle) {
	var title = this.title || (this.type + ' for "' + testTitle + '"');
	var test = new Test(title, this.fn);
	test.type = this.type;
	return test;
};
