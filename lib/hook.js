'use strict';
const Test = require('./test');

class Hook {
	constructor(title, fn) {
		if (typeof title === 'function') {
			fn = title;
			title = null;
		}

		this.title = title;
		this.fn = fn;
	}
	test(testTitle) {
		const title = this.title || `${this.metadata.type} for "${testTitle}"`;
		const test = new Test(title, this.fn);
		test.metadata = this.metadata;
		return test;
	}
}

module.exports = Hook;
