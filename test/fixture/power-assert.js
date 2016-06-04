import test from '../../';

test.serial(t => {
	const a = 'foo';

	t.true(a === 'bar');
});

test.serial(t => {
	const a = 'bar';

	t.true(a === 'foo', 'with message');
});

test.serial(t => {
	const o = {};

	t.true(o === {...o});
});

test.serial(t => {
	const React = { createElement: function(type) { return type } }

	t.true(<div /> === <span />);
});
