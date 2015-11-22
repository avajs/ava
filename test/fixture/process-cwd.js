'use strict';
const test = require('../../');

test(t => {
	t.is(process.cwd(), __dirname);
});
