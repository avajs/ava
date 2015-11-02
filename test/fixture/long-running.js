'use strict';
const test = require('../../');

test('long running', function (t) {
	t.plan(1);

	setTimeout(function () {
		console.log('I\'m gonna live forever!!');
	}, 15000);

	t.ok(true);
});
