import test from 'ava';

type RemovedByCompilation = {
	value: number;
};

type AlsoRemoved = RemovedByCompilation;

// Removing comments and declarations deliberately shifts the generated lines.
test('first', t => {
	t.pass();
});

test('target', t => {
	const value: AlsoRemoved = {value: 42};
	t.is(value.value, 42);
});
