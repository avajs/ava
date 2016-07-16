process.env.DEBUG = 'ava';

var test = require('tap').test;
var beautifyStack = require('../lib/beautify-stack');

test('should return empty string w/o any arguments', function (t) {
	t.is(beautifyStack(), '');
	t.end();
});

test('should return full stack', function (t) {
	var beautify = require('../lib/beautify-stack');

	var result = beautify(
		'Error: TypeError\n' +
		'at null._onTimeout (/ava/cli.js:27:11)\n' +
		'at Stub.listOnTimeout (timers.js:119:15)\n' +
		'From previous event:\n' +
		'	at /ava/test.js:25:9\n' +
		'at processImmediate [as _immediateCallback] (timers.js:367:17)\n' +
		'From previous event:\n' +
		'	at Object.<anonymous> (/ava/foo.js:24:3)\n' +
		'at Module._compile (module.js:460:26)\n' +
		'at Object.Module._extensions..js (module.js:478:10)\n' +
		'at Module.load (module.js:355:32)\n' +
		'at Function.Module._load (module.js:310:12)\n' +
		'at Function.Module.runMain (module.js:501:10)\n' +
		'at startup (node.js:129:16)\n' +
		'at node.js:814:3'
	);

	t.true(result.search('ava/cli.js') !== -1);

	delete process.env.DEBUG;
	t.end();
});
