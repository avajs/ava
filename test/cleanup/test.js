import test from 'ava';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const marker = path.join(os.tmpdir(), `ava-cleanup-${process.pid}.log`);
try {
	fs.unlinkSync(marker);
} catch {}

// `test.cleanup()` runs as both a `before` hook and an `after.always` hook.
test.cleanup(() => {
	fs.appendFileSync(marker, 'x');
});

let testCount = 0;

test('the before-half of cleanup runs before tests', t => {
	testCount++;
	t.true(fs.existsSync(marker));
});

test.after.always(() => {
	const content = fs.readFileSync(marker, 'utf8');
	// `cleanup` runs once as a `before` hook and once as an `after.always` hook,
	// regardless of how many tests there are.
	if (content !== 'xx') {
		throw new Error('expected cleanup to run as both a before and after.always hook, but got ' + JSON.stringify(content));
	}
});

const markerEach = path.join(os.tmpdir(), `ava-cleanup-each-${process.pid}.log`);
try {
	fs.unlinkSync(markerEach);
} catch {}

// `test.cleanupEach()` runs as both a `beforeEach` hook and an
// `afterEach.always` hook, so it runs around each test.
test.cleanupEach(() => {
	fs.appendFileSync(markerEach, 'y');
});

test('cleanupEach runs around the first test', t => {
	testCount++;
	t.true(fs.existsSync(markerEach));
});

test('cleanupEach runs around the second test', t => {
	testCount++;
	t.true(fs.existsSync(markerEach));
});

test.after.always(() => {
	const content = fs.readFileSync(markerEach, 'utf8');
	// `cleanupEach` wraps every test as a `beforeEach` + `afterEach.always` hook,
	// so it runs twice per test. `testCount` counts the tests above (the cleanup
	// test and these two), giving the total number of wrapped tests.
	const expected = testCount * 2;
	if (content.length !== expected || ![...content].every(c => c === 'y')) {
		throw new Error('expected ' + expected + ' cleanupEach executions, but got ' + JSON.stringify(content));
	}
});
