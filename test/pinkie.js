'use strict';
var childProcess = require('child_process');
var test = require('tap').test;

function execCli(args, cb) {
	if (!Array.isArray(args)) {
		args = [args];
	}

	childProcess.execFile(process.execPath, ['../cli.js'].concat(args), {cwd: __dirname}, cb);
}

test('test correct work with pinkie promise realization', function (t) {
	t.plan(1);

	execCli('fixture/pinkie.js', function (err) {
		console.log(err);
		t.false(err);
		t.end();
	});
});
