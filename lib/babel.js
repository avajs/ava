'use strict';
var loudRejection = require('loud-rejection/api')(process);
var resolveFrom = require('resolve-from');
var createEspowerPlugin = require('babel-plugin-espower/create');
var requireFromString = require('require-from-string');
var destroyCircular = require('destroy-circular');

var hasGenerators = parseInt(process.version.slice(1), 10) > 0;
var testPath = process.argv[2];
var babel;

try {
	var localBabel = resolveFrom('.', 'babel-core') || resolveFrom('.', 'babel');
	babel = require(localBabel);
} catch (err) {
	babel = require('babel-core');
}

var options = {
	blacklist: hasGenerators ? ['regenerator'] : [],
	optional: hasGenerators ? ['asyncToGenerator', 'runtime'] : ['runtime'],
	plugins: [
		createEspowerPlugin(babel, {
			patterns: require('./enhance-assert').PATTERNS
		})
	]
};

var avaRequired;

module.exports = {
	avaRequired: function () {
		avaRequired = true;
	}
};

var transpiled = babel.transformFileSync(testPath, options);
requireFromString(transpiled.code, testPath, {
	appendPaths: module.paths
});

if (!avaRequired) {
	console.error('No tests found in ' + testPath + ', make sure to import "ava" at the top of your test file');
	setImmediate(function () {
		process.exit(1);
	});
}

process.on('message', function (message) {
	var command = message['ava-child-process-command'];
	if (command) {
		process.emit('ava-' + command, message.data);
	}
});

process.on('ava-kill', function () {
	process.exit(0);
});

process.on('ava-cleanup', function () {
	var unhandled = loudRejection.currentlyUnhandled();
	if (unhandled.length) {
		unhandled = unhandled.map(function (entry) {
			var err = entry.reason;
			if (typeof err === 'object') {
				return destroyCircular(err);
			}
			if (typeof err === 'function') {
				return '[Function ' + err.name + ']';
			}
			return err;
		});
		process.send({
			name: 'unhandledRejections',
			data: {
				unhandledRejections: unhandled
			}
		});
	}

	setTimeout(function () {
		process.send({
			name: 'cleaned-up',
			data: {}
		});
	}, 100);
});
