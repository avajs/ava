import {fileURLToPath} from 'node:url';

import {test} from 'tap';

import {execCli} from './helper/cli.js';

const cli = (args, dirname = 'fixture/related', env = {}) => new Promise(resolve => {
	execCli(args, {dirname, env}, (error, stdout, stderr) => {
		resolve({error, output: `${stdout}\n${stderr}`});
	});
});

test('related source selects direct and transitive tests, not unrelated files', async t => {
	const {error, output} = await cli(['--related', 'source.js', '--tap']);
	t.error(error, output);
	t.match(output, /ok \d+ - direct/u);
	t.match(output, /ok \d+ - transitive/u);
	t.notMatch(output, /ok \d+ - unrelated/u);
});

test('a changed test selects itself', async t => {
	const {error, output} = await cli(['--related', 'unrelated.test.js', '--tap']);
	t.error(error, output);
	t.match(output, /ok \d+ - unrelated/u);
	t.notMatch(output, /ok \d+ - direct/u);
});

test('normal file selection is unchanged', async t => {
	const {error, output} = await cli(['direct.test.js', '--tap']);
	t.error(error, output);
	t.match(output, /ok \d+ - direct/u);
	t.notMatch(output, /ok \d+ - transitive/u);
});

test('cycles terminate and select the importing test', async t => {
	const {error, output} = await cli(['--related', 'cycle-b.js', '--tap']);
	t.error(error, output);
	t.match(output, /ok \d+ - cycle/u);
	t.notMatch(output, /ok \d+ - direct/u);
});

test('absolute paths, duplicate paths and multiple inputs select the union once', async t => {
	const source = fileURLToPath(new URL('fixture/related/source.js', import.meta.url));
	const {error, output} = await cli(['--related', source, source, 'unrelated.test.js', '--tap']);
	t.error(error, output);
	t.match(output, /# pass 3/u);
	t.notMatch(output, /ok \d+ - cycle/u);
});

test('unrelated changed paths do not silently run the full suite', async t => {
	const {error, output} = await cli(['--related', 'unused.js', '--tap']);
	t.ok(error);
	t.notMatch(output, /ok \d+ - (?:direct|transitive|unrelated|cycle)/u);
});

test('missing input and watch mode are rejected', async t => {
	const empty = await cli(['--related']);
	t.ok(empty.error);
	t.match(empty.output, /requires at least one changed file path/u);
	const watch = await cli(['--related', 'source.js', '--watch'], 'fixture/related', {AVA_FORCE_CI: 'not-ci'});
	t.ok(watch.error);
	t.match(watch.output, /cannot be combined with watch or debug/u);
});

test('unresolved imports conservatively select all tests', async t => {
	const {error, output} = await cli(['--related', 'missing.js', '--tap'], 'fixture/related-unresolved');
	t.error(error, output);
	t.match(output, /ok \d+ - optional/u);
	t.match(output, /ok \d+ - other/u);
});

test('a changed test also selects tests that import it', async t => {
	const {error, output} = await cli(['--related', 'a.test.js', '--tap'], 'fixture/related-test-imports');
	t.error(error, output);
	t.match(output, /importing-test/u);
	t.match(output, /# pass 3/u);
});
