'use strict';

const test = require('../../');

test(async function (t) {
	t.plan(1);

	const value = await Promise.resolve(1);

	t.is(value, 1);
});
