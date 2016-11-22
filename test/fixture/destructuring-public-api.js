import test from '../../';

test.beforeEach(t => {
	t.context = 'bar';
});

test.cb('callback mode', ({context: foo, ...t}) => {
	t.is(foo, 'bar');
	t.end();
});

test.cb('callback mode #2', ({context: foo, end, ...t}) => {
	t.is(foo, 'bar');
	end();
});

test('sync', ({context: foo, ...t}) => {
	t.is(foo, 'bar');
});
