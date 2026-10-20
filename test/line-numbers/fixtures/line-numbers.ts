import test from 'ava';

test('unicorn', t => {
	t.pass();
});

test('rainbow', t => {
	t.pass();
});

test.serial('cat', t => {
	t.pass();
});

test.todo('dog');

// eslint-disable-next-line @stylistic/max-statements-per-line
test('sun', t => t.pass()); test('moon', t => {
	t.pass();
});

{ // eslint-disable-line no-lone-blocks
	test('nested call', t => {
		t.pass();
	});
}
