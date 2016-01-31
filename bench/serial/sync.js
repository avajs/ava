import test from '../../';

for (var i = 0; i < 10000; i++) {
	test.serial('test' + i, () => {});
}
