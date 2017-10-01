import test from '../../';

test('throw an uncaught exception', t => {
	setImmediate(() => {
		throw () => {}; // eslint-disable-line no-throw-literal
	});
	t.pass();
});
