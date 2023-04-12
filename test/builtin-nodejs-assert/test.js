import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('node assertion failures are reported to the console when running in a terminal', async t => {
	const options = {
		env: {
			// The AssertionError constructor in Node.js 10 depends on the TTY interface, so opt-in
			// to it being simulated.
			AVA_SIMULATE_TTY: true,
			AVA_TTY_COLOR_DEPTH: 8,
		},
	};

	const result = await t.throwsAsync(fixture(['assert-failure.js'], options));
	const error = result.stats.getError(result.stats.failed[0]);

	t.true(error.values.every(value => value.label.includes('Assertion failed')));
});

test('node assertion failures are reported to the console when not running in a terminal', async t => {
	const result = await t.throwsAsync(fixture(['assert-failure.js']));
	const error = result.stats.getError(result.stats.failed[0]);

	t.true(error.values.every(value => value.label.includes('Assertion failed')));
});
