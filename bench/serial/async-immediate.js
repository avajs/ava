import test from '../..';

for (let i = 0; i < 10000; i++) {
	test.serial(`test${i}`, () => new Promise(resolve => setImmediate(resolve)));
}
