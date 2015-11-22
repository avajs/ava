'use strict';
const test = require('../../');
var onExit = require('signal-exit');

test.async('long running', function (t) {
	t.plan(1);

	onExit(function () {
		// simulate an exit hook that lasts a short while
		var start = Date.now();
		while(Date.now() - start < 2000) {
			//synchronously wait for 2 seconds
		}
		process.send({
			name: 'cleanup-completed',
			data: {completed: true},
			ava: true
		});
	}, {alwaysLast: true});

	setTimeout(function () {
		t.ok(true);
	});

	setTimeout(function () {
		// this would keep the process running for a long time.
		console.log('I\'m gonna live forever!!');
	}, 15000);
});
