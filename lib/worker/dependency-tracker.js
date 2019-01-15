/* eslint-disable node/no-deprecated-api */
'use strict';
const ipc = require('./ipc');

const seenDependencies = new Set();
let newDependencies = [];
function flush() {
	if (newDependencies.length === 0) {
		return;
	}

	ipc.send({type: 'dependencies', dependencies: newDependencies});
	newDependencies = [];
}

exports.flush = flush;

function track(filename) {
	if (seenDependencies.has(filename)) {
		return;
	}

	if (newDependencies.length === 0) {
		process.nextTick(flush);
	}

	seenDependencies.add(filename);
	newDependencies.push(filename);
}

exports.track = track;

function install(testPath) {
	for (const ext of Object.keys(require.extensions)) {
		const wrappedHandler = require.extensions[ext];

		require.extensions[ext] = (module, filename) => {
			if (filename !== testPath) {
				track(filename);
			}

			wrappedHandler(module, filename);
		};
	}
}

exports.install = install;
