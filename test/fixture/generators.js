'use strict';

const test = require('../../');

test ('generators', function * (t) {
	t.plan(1);

	let value = yield Promise.resolve(1);

	t.is(value, 1);
});
