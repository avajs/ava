'use strict';

const test = require('../../..');

test('test', t => {
	t.throws(() => require('./_helper'), SyntaxError);
});
