import test from '../../';

var tests = [];

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

test(t => {
	t.same(tests, ['first', 'second']);
});
