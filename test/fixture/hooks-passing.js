import test from '../../';

test.before(pass);
test.beforeEach(pass);
test.after(pass);
test.afterEach(pass);
test('pass', pass);

function pass(t) {
	t.pass();
}
