const test = require('ava');

test('foo', t => {
	(process.env.TEMPLATE ? t.snapshot : t.snapshot.skip)({foo: 'one'}); // eslint-disable-line ava/no-skip-assert
	t.snapshot({foo: 'two'});
});
