const test = require('../../');

test.async('creates an unhandled rejection', t => {
	Promise.reject(new Error(`You can't handle this!`));

	setTimeout(function () {
		t.end();
	});
});
