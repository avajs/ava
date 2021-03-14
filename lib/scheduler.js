const fs = require('fs');
const path = require('path');
const writeFileAtomic = require('write-file-atomic');
const isCi = require('./is-ci');

const FILENAME = 'failing-tests.json';

module.exports.storeFailedTestFiles = (runStatus, cacheDir) => {
	if (isCi || !cacheDir) {
		return;
	}

	try {
		writeFileAtomic.sync(path.join(cacheDir, FILENAME), JSON.stringify(runStatus.getFailedTestFiles()));
	} catch {}
};

// Order test-files, so that files with failing tests come first
module.exports.failingTestsFirst = (selectedFiles, cacheDir, cacheEnabled) => {
	if (isCi || cacheEnabled === false) {
		return selectedFiles;
	}

	const filePath = path.join(cacheDir, FILENAME);
	let failedTestFiles;
	try {
		failedTestFiles = JSON.parse(fs.readFileSync(filePath));
	} catch {
		return selectedFiles;
	}

	return [...selectedFiles].sort((f, s) => {
		if (failedTestFiles.some(tf => tf === f) && failedTestFiles.some(tf => tf === s)) {
			return 0;
		}

		if (failedTestFiles.some(tf => tf === f)) {
			return -1;
		}

		if (failedTestFiles.some(tf => tf === s)) {
			return 1;
		}

		return 0;
	});
};
