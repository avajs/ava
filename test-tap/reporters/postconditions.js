import process from 'node:process';
import {PassThrough} from 'node:stream';

import {test} from 'tap';

import '../helper/chalk0.js'; // eslint-disable-line import-x/no-unassigned-import
import DefaultReporter from '../../lib/reporters/default.js';
import TapReporter from '../../lib/reporters/tap.js';
import serializeError from '../../lib/serialize-error.js';

test('reporters label postcondition failures without changing hook titles or failure kinds', t => {
	for (const failurePhase of [undefined, 'post-test', 'post-test-file']) {
		const stream = new PassThrough();
		let output = '';
		stream.on('data', chunk => {
			output += chunk;
		});
		const event = {
			type: 'hook-failed',
			testFile: import.meta.filename,
			title: 'custom hook title',
			err: serializeError(new Error('postcondition failed')),
			logs: [],
			duration: 0,
			...(failurePhase && {failurePhase}),
		};
		const reporter = new DefaultReporter({
			projectDir: process.cwd(), reportStream: stream, stdStream: stream,
		});
		reporter.consumeStateChange(event);
		reporter.writeFailure(event);
		t.match(output, failurePhase ? `[${failurePhase} failure]: custom hook title` : '[fail]: custom hook title');
		t.equal(reporter.failures[0], event);
		if (failurePhase) {
			t.match(output, `custom hook title (${failurePhase} failure)`);
		}

		output = '';
		const tapReporter = new TapReporter({
			projectDir: process.cwd(), stdout: stream, stderr: stream, separator: ' › ',
		});
		tapReporter.startRun({titlePrefixes: new Map()});
		tapReporter.consumeEvent(event);
		t.match(output, failurePhase ? `not ok 1 - custom hook title (${failurePhase} failure)` : 'not ok 1 - custom hook title');
		t.equal(event.title, 'custom hook title');
		t.equal(event.type, 'hook-failed');
	}

	t.end();
});
