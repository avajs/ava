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
	't.notRegex(contents, regex, [message])',
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
	var createFormatter = require('power-assert-context-formatter');
	var SuccinctRenderer = require('power-assert-renderer-succinct');
	var AssertionRenderer = require('power-assert-renderer-assertion');

	return createFormatter({
		renderers: [
			{
				ctor: AssertionRenderer
			},
			{
				ctor: SuccinctRenderer,
				options: {
					maxDepth: 3
				}
			}
		]
	});
}
