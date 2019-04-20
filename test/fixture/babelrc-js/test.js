import test from '../../..';

test('foo', t => {
	// Using optional catch-binding to ensure it transpiles on Node.js 8, since this
	// is a Node.js 10 feature
	try {
		throw new Error('test');
	} catch {
		t.pass();
	}
});
