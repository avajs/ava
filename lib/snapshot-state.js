'use strict';
const path = require('path');
const jestSnapshot = require('jest-snapshot');
const globals = require('./globals');

const x = module.exports;

x.get = (initializeState, globalsOptions) => {
	if (!x.state) {
		// Set defaults - this allows tests to mock deps easily
		const options = globalsOptions || globals.options;
		const initializeSnapshotState = initializeState || jestSnapshot.initializeSnapshotState;

		const filename = options.file;
		const dirname = path.dirname(filename);
		const snapshotFileName = path.basename(filename) + '.snap';
		const snapshotsFolder = path.join(dirname, '__snapshots__', snapshotFileName);

		x.state = initializeSnapshotState(
			filename,
			options.updateSnapshots,
			snapshotsFolder,
			true
		);
	}

	return x.state;
};

x.state = null;
