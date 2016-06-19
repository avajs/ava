'use strict';
var patterns = require('ava-assert/patterns');

module.exports = enhanceAssert;
module.exports.formatter = formatter;

function enhanceAssert(opts) {
	var empower = require('empower-core');

	var enhanced = empower(
		opts.assert,
		{
			destructive: false,
			onError: opts.onError,
			onSuccess: opts.onSuccess,
			patterns: patterns.ENHANCED,
			wrapOnlyPatterns: patterns.NOT_ENHANCED,
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
