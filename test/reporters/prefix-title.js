'use strict';
require('../../lib/chalk').set();

const path = require('path');
const figures = require('figures');
const test = require('tap').test;
const chalk = require('../../lib/chalk').get();
const prefixTitle = require('../../lib/reporters/prefix-title');

const sep = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

test('removes base if found at start of path', t => {
	t.is(prefixTitle(`test${path.sep}`, path.normalize('test/run-status.js'), 'title'), `run-status${sep}title`);
	t.end();
});

test('does not remove base if found but not at start of path', t => {
	t.is(prefixTitle(path.sep, path.normalize('test/run-status.js'), 'title'), `test${sep}run-status${sep}title`);
	t.end();
});

test('removes .js extension', t => {
	t.is(prefixTitle(path.sep, 'run-status.js', 'title'), `run-status${sep}title`);
	t.end();
});

test('does not remove .js from middle of path', t => {
	t.is(prefixTitle(path.sep, 'run-.js-status.js', 'title'), `run-.js-status${sep}title`);
	t.end();
});

test('removes __tests__ from path', t => {
	t.is(prefixTitle(path.sep, path.normalize('backend/__tests__/run-status.js'), 'title'), `backend${sep}run-status${sep}title`);
	t.end();
});

test('removes .spec from path', t => {
	t.is(prefixTitle(path.sep, path.normalize('backend/run-status.spec.js'), 'title'), `backend${sep}run-status${sep}title`);
	t.end();
});

test('removes .test from path', t => {
	t.is(prefixTitle(path.sep, path.normalize('backend/run-status.test.js'), 'title'), `backend${sep}run-status${sep}title`);
	t.end();
});

test('removes test- from path', t => {
	t.is(prefixTitle(path.sep, path.normalize('backend/test-run-status.js'), 'title'), `backend${sep}run-status${sep}title`);
	t.end();
});
