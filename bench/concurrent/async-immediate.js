import test from '../..';

for (let i = 0; i < 10000; i++) {
	test(`test${i}`, () => new Promise(resolve => setImmediate(resolve)));
}
