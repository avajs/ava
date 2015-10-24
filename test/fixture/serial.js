import test from '../../';

function randomDelay() {
	return parseInt(Math.random() * 1000, 10);
}

const tests = [];

test('first', t => {
	setTimeout(() => {
		tests.push('first');
		t.end();
	}, randomDelay());
});

test('second', t => {
	setTimeout(() => {
		tests.push('second');
		t.end();
	}, randomDelay());
});

test(t => {
	t.same(tests, ['first', 'second']);
	t.end();
});
