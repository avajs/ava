'use strict';

var childProcess = require('child_process');
var path = require('path');
var fs = require('fs');
var arrify = require('arrify');
var Promise = require('bluebird');
var mkdirp = require('mkdirp');
var branch = require('git-branch').sync(path.join(__dirname, '..'));
var cliPath = require.resolve('../cli');

function runTests(_args) {
	return new Promise(function (resolve) {
		var args = [cliPath]
			.concat(arrify(_args));
		var start = Date.now();
		childProcess.execFile(process.execPath, args, {
			cwd: __dirname,
			maxBuffer: 100000 * 200
		}, function (err, stdout, stderr) {
			var end = Date.now();
			resolve({
				args: arrify(_args),
				time: end - start,
				err: err,
				stdout: stdout,
				stderr: stderr
			});
		});
	});
}

var list;

if (process.argv.length == 2) {
	list = [
		{args: 'other/failures.js', shouldFail: true},
		'serial/alternating-sync-async.js',
		'serial/async-immediate.js',
		'serial/async-timeout.js',
		'serial/sync.js',
		'concurrent/alternating-sync-async.js',
		'concurrent/async-immediate.js',
		'concurrent/async-timeout.js',
		'concurrent/sync.js',
		['concurrent/*.js', 'serial/*.js']
	].map(function (definition) {
		if (Array.isArray(definition) || typeof definition === 'string') {
			definition = {
				shouldFail: false,
				args: definition
			};
		}
		return definition;
	});
} else {
	list = [];
	var currentArgs = [];
	var shouldFail = false;
	process.argv.slice(2).forEach(function (arg) {
		if (arg === '--') {
			list.push({
				args: currentArgs,
				shouldFail: shouldFail
			});
			currentArgs = [];
			shouldFail = false;
			return;
		}
		if (arg === '--should-fail') {
			shouldFail = true;
			return;
		}
		currentArgs.push(arg);
	});
	if (currentArgs.length) {
		list.push({
			args: currentArgs,
			shouldFail: shouldFail
		});
	}
}

list.forEach(function (definition) {
	definition.args = ['--verbose'].concat(definition.args);
});

var combined = [];
for (var i = 0; i < 11; i ++) {
	combined = combined.concat(list);
}

var results = {};

Promise.each(combined, function (definition) {
	var args = definition.args;
	return runTests(args).then(function (result) {
		var key = result.args.join(' ');
		var passedOrFaild = result.err ? 'failed' : 'passed';
		var seconds = result.time / 1000;
    console.log('%s %s in %d seconds', key, passedOrFaild, seconds);
		if (result.err && !definition.shouldFail) {
			console.log(result.stdout);
			console.log(result.stderr);
			throw (result.err);
		}
		results[key] = results[key] || [];
		results[key].push({passed: !results.err, shouldFail: definition.shouldFail, time: seconds});
	});
}).then(function () {
	mkdirp.sync(path.join(__dirname, '.results'));
	results['.time'] = Date.now();
	fs.writeFileSync(
		path.join(__dirname, '.results', branch + '.json'),
		JSON.stringify(results, null, 4)
	);
});
