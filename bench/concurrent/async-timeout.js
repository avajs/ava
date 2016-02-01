import test from '../../';

for (var i = 0; i < 10000; i++) {
	test('test' + i, () => new Promise(resolve => setTimeout(resolve, 0)));
}
