const test = require('@ava/test');
const exec = require('../helpers/exec');
const path = require('path');
const {testSnapshotPruning} = require('./helpers/macros');

const testIfESM = process.version.slice(1) >= '12.17' ?
	test.serial :
	test.serial.skip;

testIfESM('snapshots remain if esmodule test file crashes during declaration', testSnapshotPruning, {
	cwd: exec.cwd(path.parse(__filename).name),
	cli: ['--update-snapshots'],
	remove: false,
	error: {
		message: /.*Uncaught exception in test\.js.*Crashing during test declaration.*1 uncaught exception.*/s
	}
});
