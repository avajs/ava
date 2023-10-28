import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('internal events are emitted', async t => {
	await fixture();

	const result = JSON.parse(await fs.readFile(fileURLToPath(new URL('fixtures/internal-events.json', import.meta.url))));

	t.like(result[0], {
		type: 'starting',
		testFile: fileURLToPath(new URL('fixtures/test.js', import.meta.url)),
	});

	const testPassedEvent = result.find(event => event.type === 'test-passed');
	t.like(testPassedEvent, {
		type: 'test-passed',
		title: 'placeholder',
		testFile: fileURLToPath(new URL('fixtures/test.js', import.meta.url)),
	});

	t.like(result[result.length - 1], {
		type: 'end',
	});
});
