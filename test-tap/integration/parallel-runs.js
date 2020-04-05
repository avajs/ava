'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');

test('correctly distributes the test files', t => {
	t.plan(3);
	for (let i = 0; i < 3; i++) {
		execCli([], {
			dirname: 'fixture/parallel-runs',
			env: {
				AVA_FORCE_CI: 'ci',
				CI_NODE_INDEX: String(i),
				CI_NODE_TOTAL: '3'
			}
		}, err => t.ifError(err));
	}
});
