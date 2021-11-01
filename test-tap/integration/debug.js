import {test} from 'tap';

import {execCli} from '../helper/cli.js';

test('bails when using --watch while while debugging', t => {
	execCli(['debug', '--watch', 'test.cjs'], {dirname: 'fixture/watcher', env: {AVA_FORCE_CI: 'not-ci'}}, (error, stdout, stderr) => {
		t.equal(error.code, 1);
		t.match(stderr, 'Watch mode is not available when debugging.');
		t.end();
	});
});

test('bails when debugging in CI', t => {
	execCli(['debug', 'test.cjs'], {dirname: 'fixture/watcher', env: {AVA_FORCE_CI: 'ci'}}, (error, stdout, stderr) => {
		t.equal(error.code, 1);
		t.match(stderr, 'Debugging is not available in CI.');
		t.end();
	});
});

test('bails when --tap reporter is used while debugging', t => {
	execCli(['debug', '--tap', 'test.cjs'], {dirname: 'fixture/watcher', env: {AVA_FORCE_CI: 'not-ci'}}, (error, stdout, stderr) => {
		t.equal(error.code, 1);
		t.match(stderr, 'The TAP reporter is not available when debugging.');
		t.end();
	});
});
