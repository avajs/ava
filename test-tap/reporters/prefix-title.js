import path from 'node:path';

import figures from 'figures';
import {test} from 'tap';

import {chalk} from '../../lib/chalk.js';
import prefixTitle from '../../lib/reporters/prefix-title.js';

const sep = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

test('removes base if found at start of path', t => {
	t.equal(prefixTitle(['cjs'], `test${path.sep}`, path.normalize('test/run-status.cjs'), 'title'), `run-status${sep}title`);
	t.end();
});

test('does not remove base if found but not at start of path', t => {
	t.equal(prefixTitle(['cjs'], path.sep, path.normalize('test/run-status.cjs'), 'title'), `test${sep}run-status${sep}title`);
	t.end();
});

test('removes .js extension', t => {
	t.equal(prefixTitle(['cjs'], path.sep, 'run-status.cjs', 'title'), `run-status${sep}title`);
	t.end();
});

test('does not remove .js from middle of path', t => {
	t.equal(prefixTitle(['cjs'], path.sep, 'run-.js-status.cjs', 'title'), `run-.js-status${sep}title`);
	t.end();
});

test('removes __tests__ from path', t => {
	t.equal(prefixTitle(['cjs'], path.sep, path.normalize('backend/__tests__/run-status.cjs'), 'title'), `backend${sep}run-status${sep}title`);
	t.end();
});

test('removes .spec from file', t => {
	t.equal(prefixTitle(['cjs'], path.sep, path.normalize('backend/run-status.spec.cjs'), 'title'), `backend${sep}run-status${sep}title`);
	t.end();
});

test('retains .spec elsewhere in path', t => {
	t.equal(prefixTitle(['cjs'], path.sep, path.normalize('backend.spec/run-status.cjs'), 'title'), `backend.spec${sep}run-status${sep}title`);
	t.end();
});

test('removes .test from file', t => {
	t.equal(prefixTitle(['cjs'], path.sep, path.normalize('backend/run-status.test.cjs'), 'title'), `backend${sep}run-status${sep}title`);
	t.equal(prefixTitle(['cjs'], path.sep, path.normalize('backend/run-status.tests.cjs'), 'title'), `backend${sep}run-status.tests${sep}title`);
	t.end();
});

test('retains .test elsewhere in path', t => {
	t.equal(prefixTitle(['cjs'], path.sep, path.normalize('backend.test/run-status.cjs'), 'title'), `backend.test${sep}run-status${sep}title`);
	t.end();
});

test('removes test- from file', t => {
	t.equal(prefixTitle(['cjs'], path.sep, path.normalize('backend/test-run-status.cjs'), 'title'), `backend${sep}run-status${sep}title`);
	t.end();
});

test('retains test- elsewhere in path', t => {
	t.equal(prefixTitle(['cjs'], path.sep, path.normalize('backend-test/run-status.cjs'), 'title'), `backend-test${sep}run-status${sep}title`);
	t.end();
});
