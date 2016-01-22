'use strict';
module.exports = TestCollection;

function TestCollection() {
	if (!(this instanceof TestCollection)) {
		throw new Error('must use `new TestCollection()`');
	}
	this.serial = [];
	this.concurrent = [];
	this.tests = {
		before: [],
		beforeEach: [],
		after: [],
		afterEach: []
	};
	this.hasExclusive = false;
}

TestCollection.prototype.add = function (test) {
	var metadata = test.metadata;
	var type = metadata.type;
	if (!type) {
		throw new Error('test type must be specified');
	}
	if (type === 'test') {
		if (metadata.exclusive) {
			this.hasExclusive = true;
		}
		(metadata.serial ? this.serial : this.concurrent).push(test);
		return;
	}
	if (metadata.exclusive) {
		throw new Error('you can\'t use only with a ' + type + ' test');
	}
	this.tests[type].push(test);
};
