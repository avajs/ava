const test = require('../../');

test('creates an unhandled rejection', t => {
	Promise.reject(new Error(`You can't handle this!`));

	setTimeout(function () {
		t.end();
	}, 0);
});
