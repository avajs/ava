import test from '../..';

test.serial('bar', t => {
	const a = 'foo';
	t.true(a === 'bar');
});

test.serial('foo', t => {
	const a = 'bar';
	t.true(a === 'foo', 'with message');
});

test.serial('span', t => {
	const React = { // eslint-disable-line no-unused-vars
		createElement: type => type
	};

	t.true(<div /> === <span />);
});
