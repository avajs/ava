import test from '../../../..';

function throwError() {
	throw new Error('uh-oh');
}

function returnRejectedPromise() {
	return Promise.reject(new Error('uh-oh'));
}

test('throws', t => {
	t.throws(() => throwError(), TypeError);
});

test('notThrows', t => {
	t.notThrows(() => throwError());
});

test('notThrowsAsync', t => {
	t.notThrowsAsync(() => throwError());
});

test('throwsAsync', t => {
	t.throwsAsync(() => throwError(), TypeError);
});

test('throwsAsync different error', t => {
	return t.throwsAsync(returnRejectedPromise, TypeError);
});
