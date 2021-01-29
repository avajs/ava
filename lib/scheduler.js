const fs = require('fs');
const path = require('path');
const tempDir = require('temp-dir');

const buildPath = projectDir => path.join(tempDir, 'ava', path.basename(projectDir));
const FILE_NAME_FAILING_TEST = 'failing-test.json';

module.exports.prepareTestResultsFile = projectDir => {
	const temporaryResultsDir = buildPath(projectDir);
	try {
		fs.statSync(temporaryResultsDir);
	} catch {
		fs.mkdirSync(temporaryResultsDir, {recursive: true});
	}

	return path.join(temporaryResultsDir, FILE_NAME_FAILING_TEST);
};

module.exports.deleteFile = filePath => {
	try {
		fs.unlinkSync(filePath);
	} catch {
	}
};

module.exports.store = (filePath, data) => {
	fs.writeFileSync(filePath, data);
};

// Order test-files, so that files with failing tests come first
module.exports.failingTestsFirst = (projectDir, selectedFiles) => {
	const filePath = path.join(buildPath(projectDir), FILE_NAME_FAILING_TEST);
	let failedTestFiles = [];
	try {
		failedTestFiles = JSON.parse(fs.readFileSync(filePath));
	} catch {
		return;
	}

	selectedFiles.sort((f, s) => {
		if (failedTestFiles.find(tf => tf === f) && failedTestFiles.find(tf => tf === s)) {
			return 0;
		}

		if (failedTestFiles.find(tf => tf === f)) {
			return -1;
		}

		if (failedTestFiles.find(tf => tf === s)) {
			return 1;
		}

		return 0;
	});
};
