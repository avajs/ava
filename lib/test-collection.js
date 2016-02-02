'use strict';
module.exports = TestCollection;

function TestCollection() {
	if (!(this instanceof TestCollection)) {
		throw new TypeError('Class constructor TestCollection cannot be invoked without \'new\'');
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
		if (this.hasExclusive && !metadata.exclusive) {
			return;
		}

		if (metadata.exclusive && !this.hasExclusive) {
			this.hasExclusive = true;
			this.serial = [];
			this.concurrent = [];
		}

		(metadata.serial ? this.serial : this.concurrent).push(test);

		return;
	}

	if (metadata.exclusive) {
		throw new Error('you can\'t use "only" with a ' + type + ' test');
	}

	this.tests[type].push(test);
};

var fnName = require('fn-name');
var Sequence = require('./sequence');
var Concurrent = require('./concurrent');
var Test = require('./test');

function computeTitle(entry) {
	entry.title = entry.title || fnName(entry.fn);

	// workaround for Babel giving anonymous functions a name
	if (entry.title === 'callee$0$0') {
		entry.title = null;
	}

	if (!entry.title) {
		if (entry.metadata.type === 'test') {
			entry.title = '[anonymous]';
		} else {
			entry.title = entry.metadata.type;
		}
	}
}

function buildHooks(hookArray, title, contextRef, report) {
	return hookArray.map(function (hook) {
		var test = buildHook(hook, title, contextRef, report);

		if (hook.metadata.skipped) {
			return skipRunner(test, report);
		}

		return test;
	});
}

function buildHook(hook, title, contextRef, report) {
	var test = new Test(hook.title + ' for ' + title, hook.fn, contextRef, report);
	test.metadata = hook.metadata;
	return test;
}

function buildTest(entry, ctxRef, report) {
	var test = new Test(entry.title, entry.fn, ctxRef, report);
	test.metadata = entry.metadata;
	return test;
}

function skipRunner(test, report) {
	return {
		run: function () {
			var result = {
				passed: true,
				result: test
			};
			if (report) {
				report(result);
			}
			return result;
		}
	};
}

function buildTestWithHooks(entry, beforeEach, afterEach, report) {
	if (entry.metadata.skipped) {
		return [skipRunner(buildTest(entry), report)];
	}

	var contextRef = {context: {}};
	var arr = buildHooks(beforeEach, entry.title, contextRef, report);
	arr.push(buildTest(entry, contextRef, report));

	return arr.concat(buildHooks(afterEach, entry.title, contextRef, report));
}

TestCollection.prototype.buildPhases = function (report, bail) {
	bail = Boolean(bail);
	[
		this.serial,
		this.concurrent,
		this.tests.before,
		this.tests.beforeEach,
		this.tests.after,
		this.tests.afterEach
	].forEach(function (arr) {
		arr.forEach(computeTitle);
	});

	return new Sequence(
		[
			new Sequence(this.tests.before.map(function (entry) {
				if (entry.metadata.skipped) {
					return skipRunner(entry, report);
				}

				return buildTest(entry, null, report);
			})),
			new Sequence([
				new Sequence(this.serial.map(function (entry) {
					return new Sequence(buildTestWithHooks(entry, this.tests.beforeEach, this.tests.afterEach, report), true);
				}, this), bail),
				new Concurrent(this.concurrent.map(function (entry) {
					return new Sequence(buildTestWithHooks(entry, this.tests.beforeEach, this.tests.afterEach, report), true);
				}, this), bail)
			], bail),
			new Sequence(this.tests.after.map(function (entry) {
				if (entry.metadata.skipped) {
					return skipRunner(entry, report);
				}

				return buildTest(entry, null, report);
			}))
		],
		true
	);
};
