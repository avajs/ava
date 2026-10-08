import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {createRelatedTestSelector} from '../../lib/related-tests.js';

import test from 'ava';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

const fooSrc = path.join(fixtures, 'src', 'foo.js');
const barSrc = path.join(fixtures, 'src', 'bar.js');
const fooTest = path.join(fixtures, 'test', 'foo.test.js');
const barTest = path.join(fixtures, 'test', 'bar.test.js');
const unrelatedTest = path.join(fixtures, 'test', 'unrelated.test.js');

const allTests = [fooTest, barTest, unrelatedTest];

test('selects only the test that imports the related source file', t => {
	const selector = createRelatedTestSelector(fooSrc, fixtures);
	const result = selector(allTests, []);
	t.deepEqual(result, [fooTest]);
});

test('selects every test that imports the related source file', t => {
	const selector = createRelatedTestSelector(barSrc, fixtures);
	const result = selector(allTests, []);
	t.deepEqual([...result].toSorted(), [barTest, fooTest].toSorted());
});

test('supports transitive imports', t => {
	// Foo.test.js imports src/foo.js, which in turn imports src/bar.js. A change
	// to src/bar.js is therefore related to foo.test.js through the import graph.
	const selector = createRelatedTestSelector(barSrc, fixtures);
	const result = selector([fooTest], []);
	t.deepEqual(result, [fooTest]);
});

test('respects an existing selection filter', t => {
	const selector = createRelatedTestSelector(fooSrc, fixtures);
	const result = selector(allTests, [barTest, unrelatedTest]);
	t.deepEqual(result, []);
});

test('returns the selection unchanged when no related files are given', t => {
	const selector = createRelatedTestSelector([], fixtures);
	const result = selector(allTests, [fooTest, barTest]);
	t.deepEqual(result, [fooTest, barTest]);
});

test('accepts space- or comma-separated related files', t => {
	const selector = createRelatedTestSelector(`${fooSrc} ${barSrc}`, fixtures);
	const result = selector(allTests, []);
	t.deepEqual([...result].toSorted(), [fooTest, barTest].toSorted());
});
