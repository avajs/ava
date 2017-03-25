'use strict';
const dotProp = require('dot-prop');
const formatValue = require('./format-assert-error').formatValue;

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

const formatter = context => {
	const ast = JSON.parse(context.source.ast);
	const tokens = JSON.parse(context.source.tokens);
	const args = context.args[0].events;

	return args
		.map(arg => {
			const range = getNode(ast, arg.espath).range;
			return [computeStatement(tokens, range), formatValue(arg.value, {maxDepth: 1})];
		})
		.reverse();
};

const enhanceAssert = (pass, fail, assertions) => {
	const empower = require('empower-core');
	return empower(assertions, {
		destructive: true,
		onError(event) {
			const error = event.error;
			if (event.powerAssertContext) { // Context may be missing in internal tests.
				error.statements = formatter(event.powerAssertContext);
			}
			fail(this, error);
		},
		onSuccess() {
			pass(this);
		},
		patterns: PATTERNS,
		bindReceiver: false
	});
};
module.exports = enhanceAssert;
