'use strict';

const dotProp = require('dot-prop');

module.exports = enhanceAssert;
module.exports.formatter = formatter;

// When adding patterns, don't forget to add to
// https://github.com/avajs/babel-preset-transform-test-files/blob/master/espower-patterns.json
// Then release a new version of that preset and bump the SemVer range here.
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
	't.snapshot(contents, [message])',
	't.is(value, expected, [message])',
	't.not(value, expected, [message])',
	't.deepEqual(value, expected, [message])',
	't.notDeepEqual(value, expected, [message])',
	't.regex(contents, regex, [message])',
	't.notRegex(contents, regex, [message])',
	't.same(value, expected, [message])',
	't.notSame(value, expected, [message])',
	't.jsxEqual(value, expected, [message])',
	't.jsxNotEqual(value, expected, [message])'
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

function isRangeMatch(a, b) {
	return (a[0] === b[0] && a[1] === b[1]) ||
		(a[0] > b[0] && a[0] < b[1]) ||
		(a[1] > b[0] && a[1] < b[1]);
}

function computeStatement(tokens, range) {
	return tokens
		.filter(token => isRangeMatch(token.range, range))
		.map(token => token.value === undefined ? token.type.label : token.value)
		.join('');
}

function getNode(ast, path) {
	return dotProp.get(ast, path.replace(/\//g, '.'));
}

function formatter() {
	return context => {
		var ast = JSON.parse(context.source.ast);
		var tokens = JSON.parse(context.source.tokens);
		var args = context.args[0].events;

		return args
			.map(arg => {
				var range = getNode(ast, arg.espath).range;

				return [
					computeStatement(tokens, range),
					arg.value
				];
			})
			.reverse();
	};
}
