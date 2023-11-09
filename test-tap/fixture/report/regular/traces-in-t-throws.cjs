const test = require('../../../../entrypoints/main.cjs');

function throwError() {
	throw new Error('uh-oh');
}

function returnRejectedPromise() {
	return Promise.reject(new Error('uh-oh'));
}

test('throws', t => {
	t.throws(() => throwError(), {instanceOf: TypeError});
});

test('notThrows', t => {
	t.notThrows(() => throwError());
});

test('notThrowsAsync', async t => {
	await t.notThrowsAsync(() => throwError());
});

test('throwsAsync', async t => {
	await t.throwsAsync(() => throwError(), {instanceOf: TypeError});
});

test('throwsAsync different error', async t => {
	await t.throwsAsync(returnRejectedPromise, {instanceOf: TypeError});
});
