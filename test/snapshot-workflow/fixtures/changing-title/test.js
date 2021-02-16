const test = require('ava');

test(`a ${process.env.TEMPLATE ? '' : 'new '}title`, t => {
	t.snapshot({foo: 'one'});
});
