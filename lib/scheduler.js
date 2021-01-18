const fs = require('fs');
const path = require('path');
const tempDir = require('temp-dir');

const buildPath = (projectDir) => path.join(tempDir, 'ava', path.basename(projectDir));
const FILE_NAME_FAILING_TEST = 'failing-test.json';
const ERRNO_FILE_NOT_FOUND = -4058;

module.exports.prepareTestResultsFile = (projectDir) => {
	const tmpResultsDir = buildPath(projectDir);
	try{
		fs.statSync(tmpResultsDir);
	} catch(_) {
		fs.mkdirSync(tmpResultsDir, {recursive: true});
	}
	return path.join(tmpResultsDir, FILE_NAME_FAILING_TEST);
};

module.exports.deleteFile = (filePath) => {
	try{
		fs.unlinkSync(filePath);
	} catch(_) {
	}
};

module.exports.store = (filePath, data) => {
	fs.writeFileSync(filePath, data);
};

// order test-files, so that files with failing tests come first
module.exports.failingTestsFirst = (projectDir, selectedFiles) => {
	const filePath = path.join(buildPath(projectDir), FILE_NAME_FAILING_TEST);
	let failedTestFiles = [];
	try{
		failedTestFiles = JSON.parse(fs.readFileSync(filePath));
	} catch(_) {
		return;
	}

	selectedFiles.sort((f, s) => {
		if (failedTestFiles.find(tf => tf === f) && failedTestFiles.find(tf => tf === s)) {
			return 0;
		}else if(failedTestFiles.find(tf => tf === f)) {
			return -1;
		}else if(failedTestFiles.find(tf => tf === s)) {
			return 1;
		}
	});
};
