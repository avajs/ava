var proxyquire = require('proxyquire').noPreserveCache();
var test = require('tap').test;
var beautifyStack = proxyquire('../lib/beautify-stack', {
	debug: function () {
		return {
			enabled: false
		};
	}
});

test('does not strip ava internals and dependencies from stack trace with debug enabled', function (t) {
	var beautify = proxyquire('../lib/beautify-stack', {
		debug: function () {
			return {
				enabled: true
			};
		}
	});

	var result = beautify(
		'Error: TypeError\n' +
		'at null._onTimeout (/ava/cli.js:27:11)\n' +
		'at Stub.listOnTimeout (timers.js:119:15)\n'
	);

	t.true(result.indexOf('ava/cli.js') >= 0);
	t.end();
});

test('strips ava internals and dependencies from stack trace with debug disabled', function (t) {
	var result = beautifyStack(
		'Error: TypeError\n' +
		'at null._onTimeout (/ava/cli.js:27:11)\n' +
		'at Stub.listOnTimeout (timers.js:119:15)\n'
	);

	t.true(result.indexOf('ava/cli.js') === -1);
	t.end();
});

test('returns empty string without any arguments', function (t) {
	t.is(beautifyStack(), '');
	t.end();
});
