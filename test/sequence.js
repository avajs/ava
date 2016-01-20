var test = require('tap').test;
var Sequence = require('../lib/sequence');
var _Test = require('../lib/test');
var delay = require('delay');

function Test(title, fn) {
	var test = new _Test(title, fn);
	test.metadata = {callback: false};
	return test;
}


test('set of tests', function (t) {
	t.plan(2);
	new Sequence([
		new Test('foo', function (a) {
			return delay(30).then(function () {
				a.context = 'foo';
			});
		}),
		new Test('bar', function (a) {
			t.is(a.context, 'foo');
		})
	]).run().then(function () {
		t.pass();
		t.end();
	});
});
