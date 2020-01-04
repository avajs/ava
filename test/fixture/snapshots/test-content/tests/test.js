const test = require('../../../../..');

test('test title', t => {
	t.snapshot({foo: 'bar'});
});
