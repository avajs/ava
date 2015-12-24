import test from '../../';

test.cb('creates an unhandled rejection', t => {
	Promise.reject(new Error(`You can't handle this!`));

	setTimeout(() => {
		t.end();
	});
});
