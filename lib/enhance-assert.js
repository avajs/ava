'use strict';
const dotProp = require('dot-prop');

// When adding patterns, don't forget to add to
// https://github.com/avajs/babel-preset-transform-test-files/blob/master/espower-patterns.json
// Then release a new version of that preset and bump the SemVer range here.
const PATTERNS = [
	't.truthy(value, [message])',
	't.falsy(value, [message])',
	't.true(value, [message])',
	't.false(value, [message])',
	't.regex(contents, regex, [message])',
	't.notRegex(contents, regex, [message])'
];

const NON_ENHANCED_PATTERNS = [
	't.pass([message])',
	't.fail([message])',
	't.throws(fn, [message])',
	't.notThrows(fn, [message])',
	't.ifError(error, [message])',
	't.snapshot(contents, [message])',
	't.is(value, expected, [message])',
	't.not(value, expected, [message])',
	't.deepEqual(value, expected, [message])',
	't.notDeepEqual(value, expected, [message])'
];

const enhanceAssert = opts => {
	const empower = require('empower-core');
	const enhanced = empower(opts.assert, {
		destructive: false,
		onError: opts.onError,
		onSuccess: opts.onSuccess,
		patterns: PATTERNS,
		wrapOnlyPatterns: NON_ENHANCED_PATTERNS,
		bindReceiver: false
	});

	return enhanced;
};

const isRangeMatch = (a, b) => {
	return (a[0] === b[0] && a[1] === b[1]) ||
		(a[0] > b[0] && a[0] < b[1]) ||
		(a[1] > b[0] && a[1] < b[1]);
};

const computeStatement = (tokens, range) => {
	return tokens
		.filter(token => isRangeMatch(token.range, range))
		.map(token => token.value === undefined ? token.type.label : token.value)
		.join('');
};

const getNode = (ast, path) => dotProp.get(ast, path.replace(/\//g, '.'));

const formatter = () => {
	return context => {
		const ast = JSON.parse(context.source.ast);
		const tokens = JSON.parse(context.source.tokens);
		const args = context.args[0].events;

		return args
			.map(arg => {
				const range = getNode(ast, arg.espath).range;
				return [computeStatement(tokens, range), arg.value];
			})
			.reverse();
	};
};

module.exports = enhanceAssert;
module.exports.PATTERNS = PATTERNS;
module.exports.NON_ENHANCED_PATTERNS = NON_ENHANCED_PATTERNS;
module.exports.formatter = formatter;
