'use strict';
const path = require('path');
const fs = require('fs');
const uniqueTempDir = require('unique-temp-dir');
const mkdirp = require('mkdirp');
const test = require('tap').test;
const Snapshot = require('../lib/snapshot');
const globals = require('../lib/globals');

test('fail without test path', t => {
	t.throws(() => new Snapshot(), 'Test file path is required');
	t.end();
});

test('build paths', t => {
	const dirPath = uniqueTempDir();

	const snapshot = new Snapshot(path.join(dirPath, 'test.js'));
	t.is(snapshot.dirPath, path.join(dirPath, '__snapshots__'));
	t.is(snapshot.filePath, path.join(dirPath, '__snapshots__', 'test.js.snap'));
	t.deepEqual(snapshot.tests, {});
	t.end();
});

test('read existing snapshots', t => {
	const dirPath = uniqueTempDir();
	mkdirp.sync(path.join(dirPath, '__snapshots__'));
	fs.writeFileSync(path.join(dirPath, '__snapshots__', 'test.js.snap'), JSON.stringify({a: {b: 1}}));

	const snapshot = new Snapshot(path.join(dirPath, 'test.js'));
	t.deepEqual(snapshot.tests, {a: {b: 1}});
	t.end();
});

test('match without snapshot', t => {
	const snapshot = new Snapshot(path.join(uniqueTempDir(), 'test.js'));
	t.deepEqual(snapshot.match('a', {b: 1}), {pass: true});
	t.deepEqual(snapshot.tests, {a: {b: 1}});
	t.end();
});

test('successful match with snapshot', t => {
	const snapshot = new Snapshot(path.join(uniqueTempDir(), 'test.js'));
	t.deepEqual(snapshot.match('a', {b: 1}), {pass: true});
	t.deepEqual(snapshot.match('a', {b: 1}), {pass: true});
	t.end();
});

test('failed match with snapshot', t => {
	const snapshot = new Snapshot(path.join(uniqueTempDir(), 'test.js'));
	t.deepEqual(snapshot.match('a', {b: 1}), {pass: true});
	t.deepEqual(snapshot.match('a', {b: 2}), {
		pass: false,
		actual: {b: 2},
		expected: {b: 1}
	});
	t.end();
});

test('update snapshots', t => {
	const snapshot = new Snapshot(path.join(uniqueTempDir(), 'test.js'), {update: true});
	t.deepEqual(snapshot.match('a', {b: 1}), {pass: true});
	t.deepEqual(snapshot.match('a', {b: 2}), {pass: true});
	t.end();
});

test('save snapshots', t => {
	const dirPath = path.join(uniqueTempDir(), 'sub', 'dir');
	const snapshot = new Snapshot(path.join(dirPath, 'test.js'));
	snapshot.match('a', {b: 1});
	snapshot.match('b', {a: 1});
	snapshot.save();

	const snapshots = JSON.parse(fs.readFileSync(path.join(dirPath, '__snapshots__', 'test.js.snap')));
	t.deepEqual(snapshots, {
		a: {b: 1},
		b: {a: 1}
	});
	t.end();
});

test('return singleton', t => {
	const oldValue = globals.options.file;
	globals.options.file = path.join(uniqueTempDir(), 'test.js');

	const firstSnapshot = Snapshot.getSnapshot();
	t.true(firstSnapshot instanceof Snapshot);

	const secondSnapshot = Snapshot.getSnapshot();
	t.is(secondSnapshot, firstSnapshot);

	globals.options.file = oldValue;
	t.end();
});
