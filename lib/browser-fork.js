'use strict';
var EventEmitter = require('events').EventEmitter;
var path = require('path');
var objectAssign = require('object-assign');
var Promise = require('bluebird');
var debug = require('debug')('ava');
var AvaError = require('./ava-error');
var send = require('./send');

var env = process.env;

// ensure NODE_PATH paths are absolute
if (env.NODE_PATH) {
	env = objectAssign({}, env);

	env.NODE_PATH = env.NODE_PATH
		.split(path.delimiter)
		.map(function (x) {
			return path.resolve(x);
		})
		.join(path.delimiter);
}

module.exports = function (file, opts) {
	opts = objectAssign({
		file: file
	}, opts);

	var relFile = path.relative('.', file);

	var testResults = [];
	var results;

	var worker = new Worker('test-worker.js');
	var events = new EventEmitter();

	var promise = new Promise(function (resolve, reject) {
		worker.addEventListener('error', reject, false);

		events.on('exit', function () {
			if (results) {
				resolve(results);
			} else {
				reject(new AvaError('Test results were not received from ' + relFile));
			}
		});

		events.on('no-tests', function (data) {
			send(worker, 'teardown');

			var message = 'No tests found in ' + relFile;

			if (!data.avaRequired) {
				message += ', make sure to import "ava" at the top of your test file';
			}

			reject(new AvaError(message));
		});
	});

	worker.addEventListener('message', function (e) {
		var event = e.data;

		if (!event.ava) {
			return;
		}

		event.name = event.name.replace(/^ava\-/, '');
		event.data.file = file;

		debug('ipc %s:\n%o', event.name, event.data);

		events.emit(event.name, event.data);
	}, false);

	events.on('test', function (props) {
		testResults.push(props);
	});

	events.on('results', function (data) {
		results = data;
		data.tests = testResults;

		send(worker, 'teardown');
	});

	// teardown finished, now exit
	events.on('teardown', function () {
		send(worker, 'exit');
	});

	// uncaught exception in fork, need to exit
	events.on('uncaughtException', function () {
		send(worker, 'teardown');
	});

	promise.on = function () {
		events.on.apply(events, arguments);

		return promise;
	};

	promise.send = function (name, data) {
		send(worker, name, data);

		return promise;
	};

	promise.exit = function () {
		send(worker, 'init-exit');

		return promise;
	};

	// send 'run' event only when fork is listening for it
	var isReady = false;

	events.on('stats', function () {
		isReady = true;
	});

	promise.run = function (options) {
		if (isReady) {
			send(worker, 'run', options);
			return promise;
		}

		events.on('stats', function () {
			send(worker, 'run', options);
		});

		return promise;
	};

	send(worker, 'init', opts);

	return promise;
};
