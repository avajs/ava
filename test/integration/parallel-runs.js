'use strict';
const test = require('tap').test;
const {execCli} = require('../helper/cli');

test('correctly distributes the test files', t => {
	t.plan(3);
	for (let i = 0; i < 3; i++) {
		execCli('*.js', {
			dirname: 'fixture/parallel-runs',
			env: {
				CI: '1',
				CI_NODE_INDEX: String(i),
				CI_NODE_TOTAL: '3'
			}
		}, err => t.ifError(err));
	}
});
