const test = require('@ava/test');
const exec = require('../helpers/exec');

// The AssertionError constructor in Node 10 depends on the TTY interface
test('node assertion failures are reported to the console when running in a terminal', async t => {
	const options = {
		env: {
			AVA_SIMULATE_TTY: true,
			AVA_TTY_COLOR_DEPTH: 8,
			AVA_TTY_HAS_COLORS: typeof process.stderr.hasColors === 'function'
		}
	};

	const result = await t.throwsAsync(exec.fixture(['assert-failure.js'], options));
	const error = result.stats.getError(result.stats.failed[0]);

	t.snapshot(error.message, 'error message');
	t.snapshot(error.values, 'formatted values');
});

test('node assertion failures are reported to the console when not running in a terminal', async t => {
	const result = await t.throwsAsync(exec.fixture(['assert-failure.js']));
	const error = result.stats.getError(result.stats.failed[0]);

	t.snapshot(error.message, 'error message');
	t.snapshot(error.values, 'formatted values');
});
