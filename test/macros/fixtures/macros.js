import test from 'ava';

const withoutTitle = test.macro((t, arg) => {
	t.is(arg, 'arg');
});
const withTitle = test.macro({
	exec(t, arg) {
		t.is(arg, 'arg');
	},
	title(provided, arg) {
		return `${provided || ''} ${arg}`;
	},
});

test('without title', withoutTitle, 'arg');
test('with title', withTitle, 'arg');
test(withTitle, 'arg');
