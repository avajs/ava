module.exports = enhanceAssert;

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

function enhanceAssert(assert) {
	var empower = require('../node_modules/empower');
	var powerAssertFormatter = require('../node_modules/power-assert-formatter');
	var powerAssertRenderers = require('../node_modules/power-assert-renderers');

	empower(assert,
		powerAssertFormatter({
			renderers: [
				powerAssertRenderers.AssertionRenderer,
				powerAssertRenderers.SuccinctRenderer
			]
		}),
		{
			destructive: true,
			modifyMessageOnRethrow: true,
			saveContextOnRethrow: false,
			patterns: module.exports.PATTERNS
		}
	);
}
