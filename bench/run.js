'use strict';
const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const arrify = require('arrify');
const Promise = require('bluebird');
const mkdirp = require('mkdirp');
const branch = require('git-branch').sync(path.join(__dirname, '..'));

const cliPath = require.resolve('../cli');

function runTests(_args) {
	return new Promise(resolve => {
		const args = [cliPath].concat(arrify(_args));
		const start = Date.now();

		childProcess.execFile(process.execPath, args, {
			cwd: __dirname,
			maxBuffer: 100000 * 200
		}, (err, stdout, stderr) => {
			const end = Date.now();
			resolve({
				args: arrify(_args),
				time: end - start,
				err,
				stdout,
				stderr
			});
		});
	});
}

let list;

if (process.argv.length === 2) {
	list = [
		{
			args: 'other/failures.js',
			shouldFail: true
		},
		'serial/alternating-sync-async.js',
		'serial/async-immediate.js',
		'serial/async-timeout.js',
		'serial/sync.js',
		'concurrent/alternating-sync-async.js',
		'concurrent/async-immediate.js',
		'concurrent/async-timeout.js',
		'concurrent/sync.js',
		['concurrent/*.js', 'serial/*.js']
	].map(definition => {
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
	let currentArgs = [];
	let shouldFail = false;

	process.argv.slice(2).forEach(arg => {
		if (arg === '--') {
			list.push({
				args: currentArgs,
				shouldFail
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

	if (currentArgs.length > 0) {
		list.push({
			args: currentArgs,
			shouldFail
		});
	}
}

list.forEach(definition => {
	definition.args = ['--verbose'].concat(definition.args);
});

let combined = [];
for (let i = 0; i < 11; i++) {
	combined = combined.concat(list);
}

const results = {};

Promise.each(combined, definition => {
	const args = definition.args;

	return runTests(args).then(result => {
		const key = result.args.join(' ');
		const passedOrFaild = result.err ? 'failed' : 'passed';
		const seconds = result.time / 1000;

		console.log('%s %s in %d seconds', key, passedOrFaild, seconds);

		if (result.err && !definition.shouldFail) {
			console.log(result.stdout);
			console.log(result.stderr);
			throw result.err;
		}

		results[key] = results[key] || [];

		results[key].push({
			passed: !results.err,
			shouldFail: definition.shouldFail,
			time: seconds
		});
	});
}).then(() => {
	mkdirp.sync(path.join(__dirname, '.results'));
	results['.time'] = Date.now();

	fs.writeFileSync(
		path.join(__dirname, '.results', `${branch}.json`),
		JSON.stringify(results, null, 4)
	);
});
