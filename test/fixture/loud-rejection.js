const test = require('../../');

test.cb('creates an unhandled rejection', t => {
	Promise.reject(new Error(`You can't handle this!`));

	setTimeout(function () {
		t.end();
	});
});
