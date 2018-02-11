import test from '../..';

for (let i = 0; i < 1000; i++) {
	test.serial(`test${i}`, t => {
		t.is(Math.random(), Math.random());
	});
}
