const test = require('../../');

test.beforeEach(fail);
test(pass);

function pass(t) {
	t.end();
}

function fail(t) {
	t.fail();
	t.end();
}
