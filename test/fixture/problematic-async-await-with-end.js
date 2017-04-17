'use strict';
const test = require('../../');

test('async function that should fail', async function (t) {
	const value = await Promise.resolve(1);

	t.is(value, 1);

	equalInTheFuture(value, 2, t.end);
});

function equalInTheFuture(a, b, cb) {
	setTimeout(() => {
		if (a === b) {
			return cb();
		} else {
			cb(new Error(`Uh oh, McFly! ${a} !== ${b}`));
		}
	}, 200);
}
