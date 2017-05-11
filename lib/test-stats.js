'use strict';

function TestStats(opts) {
	if (!(this instanceof TestStats)) {
		throw new TypeError('Class constructor TestStats cannot be invoked without \'new\'');
	}

	this.files = opts.files.slice(0);
	this.errors = [];
	this.results = Object.create(null);

	this.files.forEach(function (file) {
		this.results[file] = blankStats();
	}, this);

	if (opts.previousFiles || opts.previousStats) {
		this.previousFiles = opts.previousFiles.slice(0);

		this.previousErrors = opts.previousStats.previousErrors.filter(filterPrevious, this)
			.concat(opts.previousStats.errors.filter(filterPrevious, this));

		this.previousFiles.forEach(function (file) {
			this.results[file] = opts.previousStats.results[file];
		}, this);
	} else {
		this.previousFiles = [];
		this.previousErrors = [];
		this.errors = [];
	}
}

function filterPrevious(test) {
	return this.previousFiles.indexOf(test.file) !== -1;
}

TestStats.prototype.currentStatus = function () {
	var result = blankStats();

	this.files.forEach(function (file) {
		addStats(result, this.results[file]);
	}, this);

	result.errors = this.errors.slice(0);
	return result;
};

TestStats.prototype.previousStatus = function () {
	var result = blankStats();

	this.previousFiles.forEach(function (file) {
		addStats(result, this.results[file]);
	}, this);

	result.errors = this.previousErrors.slice(0);

	return result;
};

TestStats.prototype.onTest = function (test) {
	var result = this.results[test.file];
	if (test.skip) {
		result.skipCount++;
	} else if (test.todo) {
		result.todoCount++;
	} else if (test.error) {
		result.failCount++;
		this.errors.push(test);
	} else {
		result.passCount++;
	}
};

function blankStats() {
	return {
		skipCount: 0,
		passCount: 0,
		todoCount: 0,
		failCount: 0
	};
}

function addStats(target, source) {
	target.skipCount += source.skipCount;
	target.passCount += source.passCount;
	target.todoCount += source.todoCount;
	target.failCount += source.failCount;
}

module.exports = TestStats;
