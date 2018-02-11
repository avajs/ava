import test from '../..';

for (let i = 0; i < 10000; i++) {
	if (i % 2) {
		test.serial(`test${i}`, () => new Promise(resolve => setImmediate(resolve)));
	} else {
		test.serial(`test${i}`, () => {});
	}
}
