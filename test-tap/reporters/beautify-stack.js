import {fileURLToPath} from 'node:url';

import {test} from 'tap';

import beautifyStack from '../../lib/reporters/beautify-stack.js';

test('filters AVA internals by their actual location', t => {
	const root = new URL('../../', import.meta.url);
	const libFile = new URL('lib/assert.js', root);
	const workerFile = new URL('lib/worker/main.js', root);
	const nestedFile = new URL('lib/plugin-support/reporter-host.js', root);
	const entrypoint = new URL('entrypoints/cli.js', root);
	const userFile = new URL('test-tap/fixture/infinity-stack-trace.js', root);
	const sibling = new URL('lib-other/example.js', root);
	const stack = [
		'Error',
		`    at assertion (${libFile.href}:1:2)`,
		`    at worker (${fileURLToPath(workerFile)}:3:4)`,
		`    at plugin (${nestedFile.href}:5:6)`,
		`    at ${entrypoint.href}:7:8`,
		`    at user (${userFile.href}:9:10)`,
		`    at sibling (${sibling.href}:11:12)`,
		'    at unrelated (file:///other/ava/lib/assert.js:13:14)',
	].join('\n');

	const result = beautifyStack(stack);
	t.equal(result.length, 3);
	t.match(result[0], /user .*infinity-stack-trace\.js:9:10/);
	t.match(result[1], /sibling .*lib-other\/example\.js:11:12/);
	t.match(result[2], /unrelated .*\/other\/ava\/lib\/assert\.js:13:14/);
	t.end();
});

test('retains Promise frames while filtering Node internals', t => {
	const result = beautifyStack([
		'Error',
		'    at async Promise.all (index 0)',
		'    at new Promise (<anonymous>)',
		'    at processTicksAndRejections (node:internal/process/task_queues:103:5)',
	].join('\n'));

	t.same(result, [
		'async Promise.all (index 0)',
		'new Promise (<anonymous>)',
	]);
	t.end();
});
