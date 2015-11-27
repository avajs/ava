const test = require('../../');

test.beforeEach(fail);
test(pass);

function pass(t) {
}

function fail(t) {
	t.fail();
}
