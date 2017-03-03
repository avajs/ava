'use strict';
const path = require('path');
const fs = require('fs');
const isEqual = require('lodash.isequal');
const mkdirp = require('mkdirp');
const globals = require('./globals');

class Snapshot {
	constructor(testPath, options) {
		if (!testPath) {
			throw new TypeError('Test file path is required');
		}

		this.dirPath = path.join(path.dirname(testPath), '__snapshots__');
		this.filePath = path.join(this.dirPath, path.basename(testPath) + '.snap');
		this.tests = {};
		this.options = options || {};

		if (fs.existsSync(this.filePath)) {
			this.tests = JSON.parse(fs.readFileSync(this.filePath));
		}
	}

	save() {
		mkdirp.sync(this.dirPath);
		fs.writeFileSync(this.filePath, JSON.stringify(this.tests, null, '  '));
	}

	match(testTitle, actual) {
		const expected = this.tests[testTitle];
		if (!expected || this.options.update) {
			this.tests[testTitle] = actual;

			return {pass: true};
		}

		const isMatch = isEqual(actual, expected);
		if (isMatch) {
			return {pass: true};
		}

		return {
			pass: false,
			actual,
			expected
		};
	}
}

const x = module.exports = Snapshot;

Snapshot.getSnapshot = () => {
	if (!x.snapshot) {
		x.snapshot = new Snapshot(globals.options.file, {update: globals.options.updateSnapshots});
	}

	return x.snapshot;
};
