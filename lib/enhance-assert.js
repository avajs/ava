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
	't.notRegex(contents, regex, [message])'
];

module.exports.NON_ENHANCED_PATTERNS = [
	't.pass([message])',
	't.fail([message])',
	't.throws(fn, [message])',
	't.notThrows(fn, [message])',
	't.ifError(error, [message])',
	't.snapshot(contents, [message])'
];

function enhanceAssert(opts) {
	const empower = require('empower-core');

	const enhanced = empower(
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
	const createFormatter = require('power-assert-context-formatter');
	const SuccinctRenderer = require('power-assert-renderer-succinct');
	const AssertionRenderer = require('power-assert-renderer-assertion');

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
