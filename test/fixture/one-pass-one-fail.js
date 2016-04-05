import test from '../../';

test('this is a passing test', t => {
	t.truthy(true);
});

test('this is a failing test', t => {
	t.truthy(false);
});
