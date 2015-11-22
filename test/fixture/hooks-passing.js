const test = require('../../');

test.before(pass);
test.beforeEach(pass);
test.after(pass);
test.afterEach(pass);
test(pass);

function pass(t) {
}
