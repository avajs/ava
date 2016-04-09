'use strict';

module.exports = enhanceAssert;
module.exports.formatter = formatter;

module.exports.PATTERNS = [
	't.truthy(value, [message])',
	't.falsy(value, [message])',
	't.true(value, [message])',
	't.false(value, [message])',
	't.is(value, expected, [message])',
	't.not(value, expected, [message])',
	't.deepEqual(value, expected, [message])',
	't.notDeepEqual(value, expected, [message])',
	't.regex(contents, regex, [message])',
	// deprecated apis
	't.ok(value, [message])',
	't.notOk(value, [message])',
	't.same(value, expected, [message])',
	't.notSame(value, expected, [message])'
];

module.exports.NON_ENHANCED_PATTERNS = [
	't.pass([message])',
	't.fail([message])',
	't.throws(fn, [message])',
	't.notThrows(fn, [message])',
	't.ifError(error, [message])'
];

function enhanceAssert(opts) {
	var empower = require('empower-core');
	var enhanced = empower(
		opts.assert,
		{
			destructive: false,
			onError: opts.onError,
			onSuccess: opts.onSuccess,
			patterns: module.exports.PATTERNS,
			wrapOnlyPatterns: module.exports.NON_ENHANCED_PATTERNS,
			bindReceiver: false
		}
	);

	return enhanced;
}

function formatter() {
	var powerAssertFormatter = require('power-assert-formatter');
	var powerAssertRenderers = require('power-assert-renderers');

	return powerAssertFormatter({
		maxDepth: 3,
		renderers: [
			powerAssertRenderers.AssertionRenderer,
			powerAssertRenderers.SuccinctRenderer
		]
	});
}
