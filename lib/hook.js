var Test = require('./test');

module.exports = Hook;

function Hook(title, fn) {
	if (!(this instanceof Hook)) {
		return new Hook(title, fn);
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
