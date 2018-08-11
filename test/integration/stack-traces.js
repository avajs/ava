'use strict';
const test = require('tap').test;
const {execCli} = require('../helper/cli');

test('enabling long stack traces will provide detailed debug information', t => {
	execCli('long-stack-trace', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /From previous event/);
		t.end();
	});
});

test('`AssertionError` should capture infinity stack trace', t => {
	execCli('infinity-stack-trace.js', (err, stdout) => {
		t.ok(err);
		t.match(stdout, /c \(.+?infinity-stack-trace\.js:7:18\)/);
		t.match(stdout, /b \(.+?infinity-stack-trace\.js:8:18\)/);
		t.match(stdout, /a \(.+?infinity-stack-trace\.js:10:2\)/);
		t.end();
	});
});
