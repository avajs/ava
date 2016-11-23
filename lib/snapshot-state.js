var path = require('path');
var jestSnapshot = require('jest-snapshot');
var globals = require('./globals');

var x = module.exports;

x.get = function (initializeState, globalsOptions) {
	if (!this.state) {
		// set defaults - this allows tests to mock deps easily
		var options = globalsOptions || globals.options;
		var initializeSnapshotState = initializeState || jestSnapshot.initializeSnapshotState;

		var filename = options.file;
		var dirname = path.dirname(filename);
		var snapshotFileName = path.basename(filename) + '.snap';
		var snapshotsFolder = path.join(dirname, '__snapshots__', snapshotFileName);

		this.state = initializeSnapshotState(
			filename,
			options.updateSnapshots,
			snapshotsFolder,
			true
		);
	}

	return this.state;
};
