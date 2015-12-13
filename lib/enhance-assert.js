module.exports = enhanceAssert;
module.exports.formatter = formatter;

module.exports.PATTERNS = [
	't.ok(value, [message])',
	't.notOk(value, [message])',
	't.true(value, [message])',
	't.false(value, [message])',
	't.is(value, expected, [message])',
	't.not(value, expected, [message])',
	't.same(value, expected, [message])',
	't.notSame(value, expected, [message])',
	't.regexTest(regex, contents, [message])'
];

module.exports.NON_ENHANCED_PATTERNS = [
	't.pass([message])',
	't.fail([message])',
	't.throws(fn, [message])',
	't.doesNotThrow(fn, [message])',
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
			wrapOnlyPatterns: module.exports.NON_ENHANCED_PATTERNS
		}
	);

	enhanced.AssertionError = opts.assert.AssertionError;

	return enhanced;
}

function formatter() {
	var powerAssertFormatter = require('power-assert-formatter');
	var powerAssertRenderers = require('power-assert-renderers');

	return powerAssertFormatter({
		renderers: [
			powerAssertRenderers.AssertionRenderer,
			powerAssertRenderers.SuccinctRenderer
		]
	});
}
