import {test} from 'tap';

import {execCli} from '../helper/cli.js';

test('`AssertionError` should capture infinity stack trace', t => {
	execCli('infinity-stack-trace.js', (error, stdout) => {
		t.ok(error);
		t.match(stdout, /c \(.*infinity-stack-trace\.js:6:20\)/);
		t.match(stdout, /b \(.*infinity-stack-trace\.js:7:18\)/);
		t.match(stdout, /a \(.*infinity-stack-trace\.js:8:18\)/);
		t.match(stdout, /.+?infinity-stack-trace\.js:10:2/);
		t.end();
	});
});
