'use strict';
/* eslint-disable node/no-deprecated-api */

const seenDependencies = new Set();
function getAll() {
	return Array.from(seenDependencies);
}
exports.getAll = getAll;

function track(filename) {
	if (seenDependencies.has(filename)) {
		return;
	}

	seenDependencies.add(filename);
}
exports.track = track;

function install(testPath) {
	Object.keys(require.extensions).forEach(ext => {
		const wrappedHandler = require.extensions[ext];

		require.extensions[ext] = (module, filename) => {
			if (filename !== testPath) {
				track(filename);
			}

			wrappedHandler(module, filename);
		};
	});
}
exports.install = install;
