'use strict';
var path = require('path');
var jestSnapshot = require('jest-snapshot');
var globals = require('./globals');

var x = module.exports;

x.get = function (initializeState, globalsOptions) {
	if (!x.state) {
		// set defaults - this allows tests to mock deps easily
		var options = globalsOptions || globals.options;
		var initializeSnapshotState = initializeState || jestSnapshot.initializeSnapshotState;

		var filename = options.file;
		var dirname = path.dirname(filename);
		var snapshotFileName = path.basename(filename) + '.snap';
		var snapshotsFolder = path.join(dirname, '__snapshots__', snapshotFileName);

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
