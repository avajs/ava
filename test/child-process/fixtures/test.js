import test from 'ava';

for (let i = 0; i < 50; i++) {
	test('Test ' + (i + 1), t => {
		t.true(true);
	});
}
