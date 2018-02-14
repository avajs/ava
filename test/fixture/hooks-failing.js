import test from '../..';

test.beforeEach(fail);
test('pass', pass);

function pass() {}

function fail(t) {
	t.fail();
}
