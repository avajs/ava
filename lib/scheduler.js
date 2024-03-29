import fs from 'node:fs';
import path from 'node:path';

import writeFileAtomic from 'write-file-atomic';

import isCi from './is-ci.js';

const FILENAME = 'failing-tests.json';

const scheduler = {
	storeFailedTestFiles(runStatus, cacheDir) {
		if (isCi || !cacheDir) {
			return;
		}

		const filename = path.join(cacheDir, FILENAME);
		// Given that we're writing to a cache directory, consider this file
		// temporary.
		const temporaryFiles = [filename];
		try {
			writeFileAtomic.sync(filename, JSON.stringify(runStatus.getFailedTestFiles()), {
				tmpfileCreated(tmpfile) {
					temporaryFiles.push(tmpfile);
				},
			});
		} catch {}

		return {
			changedFiles: [],
			temporaryFiles,
		};
	},

	// Order test-files, so that files with failing tests come first
	failingTestsFirst(selectedFiles, cacheDir, cacheEnabled) {
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
			if (failedTestFiles.includes(f) && failedTestFiles.includes(s)) {
				return 0;
			}

			if (failedTestFiles.includes(f)) {
				return -1;
			}

			if (failedTestFiles.includes(s)) {
				return 1;
			}

			return 0;
		});
	},
};

export default scheduler;
