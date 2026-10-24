import path from 'node:path';
import {fileURLToPath} from 'node:url';

import test from '@ava/test';

import {selectRelatedTestFiles} from '../../lib/related-tests.js';

const cwd = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = (...parts) => path.join(cwd, 'fixtures', 'basic', ...parts);

test('selects test files that transitively import the given files', async t => {
	const {missing, related} = await selectRelatedTestFiles({
		cwd: fixturePath(),
		extensions: ['js'],
		filePatterns: ['**/*.test.js'],
		files: [fixturePath('source.js')],
	});
	t.deepEqual(missing, []);
	t.deepEqual(related.toSorted((a, b) => a.localeCompare(b)), [
		'a.test.js',
		'b.test.js',
		'dyn-nonstatic.test.js',
		'dyn-static.test.js',
	]);
});

test('selects test files that import one of several given files', async t => {
	const {related} = await selectRelatedTestFiles({
		cwd: fixturePath(),
		extensions: ['js'],
		filePatterns: ['**/*.test.js'],
		files: [fixturePath('importing.js'), fixturePath('sub/nested.js')],
	});
	t.deepEqual(related.toSorted((a, b) => a.localeCompare(b)), [
		'a.test.js',
		'b.test.js',
	]);
});

test('reports provided files that do not exist', async t => {
	const {missing, related} = await selectRelatedTestFiles({
		cwd: fixturePath(),
		extensions: ['js'],
		filePatterns: ['**/*.test.js'],
		files: [fixturePath('nonexistent.js'), fixturePath('source.js')],
	});
	t.deepEqual(missing, [fixturePath('nonexistent.js')]);
	t.deepEqual(related.toSorted((a, b) => a.localeCompare(b)), [
		'a.test.js',
		'b.test.js',
		'dyn-nonstatic.test.js',
		'dyn-static.test.js',
	]);
});

test('can filter the selection down to nothing', async t => {
	const {related} = await selectRelatedTestFiles({
		cwd: fixturePath(),
		extensions: ['js'],
		filePatterns: ['a.test.js'],
		files: [fixturePath('source.js')],
	});
	t.deepEqual(related.toSorted((a, b) => a.localeCompare(b)), ['a.test.js']);
});
