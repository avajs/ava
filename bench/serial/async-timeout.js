import test from '../..';

for (let i = 0; i < 3000; i++) {
	test.serial(`test${i}`, () => new Promise(resolve => setTimeout(resolve, 0)));
}
