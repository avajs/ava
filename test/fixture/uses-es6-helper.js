'use strict';
import test from '../../';

import helper from './_es6-helper';

test(async t => {
	t.is(await helper(), 'es6 helper');
	t.end();
});
