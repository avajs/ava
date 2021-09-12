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

test('notThrowsAsync', t => {
	t.notThrowsAsync(() => throwError());
});

test('throwsAsync', t => {
	t.throwsAsync(() => throwError(), {instanceOf: TypeError});
});

test('throwsAsync different error', t => t.throwsAsync(returnRejectedPromise, {instanceOf: TypeError}));
