const test = require('../../../../entrypoints/main.cjs');

const passes = t => {
	Promise.reject(new Error('Can’t catch me'));
	t.pass();
};

test('passes', passes);

test('unhandled non-error rejection', t => {
	const error = null;
	Promise.reject(error);
	t.pass();
});
