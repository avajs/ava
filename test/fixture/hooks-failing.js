import test from '../../';

test.beforeEach(fail);
test(pass);

function pass() {}

function fail(t) {
	t.fail();
}
