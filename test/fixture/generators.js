'use strict';

const test = require('../../');

test(function * (t) {
	t.plan(1);

	const value = yield Promise.resolve(1);

	t.is(value, 1);
});
