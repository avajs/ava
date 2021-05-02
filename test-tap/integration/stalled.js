import {test} from 'tap';

import {execCli} from '../helper/cli.js';

test('observable tests fail if event loop empties before they’re resolved', t => {
	execCli('observable.cjs', {dirname: 'fixture/stalled-tests'}, (_, stdout) => {
		t.match(stdout, /Observable returned by test never completed/);
		t.end();
	});
});

test('promise tests fail if event loop empties before they’re resolved', t => {
	execCli('promise.cjs', {dirname: 'fixture/stalled-tests'}, (_, stdout) => {
		t.match(stdout, /Promise returned by test never resolved/);
		t.end();
	});
});
