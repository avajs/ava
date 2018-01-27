'use strict';

const test = require('../../../');

test(t => {
	t.throws(() => require('./_helper'), SyntaxError);
});
