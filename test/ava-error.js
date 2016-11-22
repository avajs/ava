'use strict';
const test = require('tap').test;
const AvaError = require('../lib/ava-error');

test('must be called with new', t => {
	t.throws(() => {
		const avaError = AvaError;
		avaError('test message');
	}, {message: 'Class constructor AvaError cannot be invoked without \'new\''});
	t.end();
});
