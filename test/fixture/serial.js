import test from '../..';

const tests = [];

test.cb('first', t => {
	setTimeout(() => {
		tests.push('first');
		t.end();
	}, 300);
});

test.cb('second', t => {
	setTimeout(() => {
		tests.push('second');
		t.end();
	}, 100);
});

test('test', t => {
	t.deepEqual(tests, ['first', 'second']);
});
