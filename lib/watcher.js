'use strict';

var chokidar = require('chokidar');
var Promise = require('bluebird');

exports.start = function (logger, api, logError) {
	// TODO(novemberborn) allow these patterns to be specified, or perhaps match
	// anything (not just JS files).
	var watcher = chokidar.watch(['package.json', '**/*.js'], {
		// Copied from
		// <https://github.com/remy/nodemon/blob/8e48001dc494702bf519c6fdc2097b686de228af/lib/config/defaults.js#L12>.
		// TODO(novemberborn) extract into a package so a sensible set of patterns
		// can be shared amongst projects.
		// TODO(novemberborn) make configurable, perhaps similarly to how the
		// include patterns are specified.
		ignored: ['.git', 'node_modules', 'bower_components', '.sass-cache'],
		ignoreInitial: true
	});

	var busy = api.run().then(function () {
		logger.finish();
	}).catch(function (err) {
		logError(err);
		// Exit if an error occurs during the initial run.
		logger.exit(1);
		// Return a pending promise to avoid running new tests while exiting.
		return new Promise(function () {});
	});

	watcher.on('all', function (event) {
		if (event === 'add' || event === 'change' || event === 'unlink') {
			debounce();
		}
	});

	var debouncing = false;
	var debounceAgain = false;
	function debounce() {
		if (debouncing) {
			debounceAgain = true;
			return;
		}

		debouncing = true;
		setTimeout(function () {
			busy.then(function () {
				if (debounceAgain) {
					debouncing = debounceAgain = false;
					debounce();
				} else {
					runAfterChanges();
					debouncing = debounceAgain = false;
				}
			});
		}, 10);
	}

	function runAfterChanges() {
		// TODO(novemberborn) rerun specific file depending on the change, or rerun
		// all.
		busy = new Promise(function (resolve) {
			logger.reset();
			resolve(api.run());
		}).catch(function (err) {
			logError(err);
		}).then(function () {
			logger.finish();
		});
	}
};
