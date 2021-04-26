'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');

test('correctly distributes more test files than CI_NODE_TOTAL', t => {
	t.plan(3);
	for (let i = 0; i < 3; i++) {
		execCli([], {
			dirname: 'fixture/parallel-runs/more-files-than-ci-total',
			env: {
				AVA_FORCE_CI: 'ci',
				CI_NODE_INDEX: String(i),
				CI_NODE_TOTAL: '3'
			}
		}, err => t.error(err));
	}
});

test('correctly distributes less test files than CI_NODE_TOTAL', t => {
	t.plan(3);
	for (let i = 0; i < 3; i++) {
		execCli([], {
			dirname: 'fixture/parallel-runs/less-files-than-ci-total',
			env: {
				AVA_FORCE_CI: 'ci',
				CI_NODE_INDEX: String(i),
				CI_NODE_TOTAL: '3'
			}
		}, err => t.error(err));
	}
});

test('fail when there are no files', t => {
	t.plan(3);
	for (let i = 0; i < 3; i++) {
		execCli([], {
			dirname: 'fixture/parallel-runs/no-files',
			env: {
				AVA_FORCE_CI: 'ci',
				CI_NODE_INDEX: String(i),
				CI_NODE_TOTAL: '3'
			}
		}, err => t.ok(err));
	}
});
