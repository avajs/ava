import test from '../../';

for (var i = 0; i < 1000; i++) {
	test.serial('test' + i, t => {
		t.is(Math.random(), Math.random())
	});
}
