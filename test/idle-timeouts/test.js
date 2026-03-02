import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('idle timeouts are not blocked by console output', async t => {
	const result = await t.throwsAsync(fixture(['console-output.js']));
	const error = result.stats.getError(result.stats.failed[0]);
	t.is(error.message, 'timeout despite console output');
});

test('assertion failures are not hidden by idle timeout', async t => {
	const result = await t.throwsAsync(fixture(['assertion-before-hang.js']));
	const error = result.stats.getError(result.stats.failed[0]);
	// t.log(Object.keys(error));
	// t.log(error.formattedDetails?.map(d => d.label).join('\n'));

	t.truthy(error.formattedDetails?.some(detail => /Difference \(- actual, \+ expected\):/.test(detail.label)));
	t.notRegex(error.message, /no new tests completed within the last/);
});
