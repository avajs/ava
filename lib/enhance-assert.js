'use strict';
const concordance = require('concordance');
const dotProp = require('dot-prop');
const generate = require('babel-generator').default;
const concordanceOptions = require('./concordance-options').default;

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

const computeStatement = node => generate(node, {quotes: 'single'}).code;
const getNode = (ast, path) => dotProp.get(ast, path.replace(/\//g, '.'));

const formatter = context => {
	const ast = JSON.parse(context.source.ast);
	const args = context.args[0].events;
	return args
		.map(arg => {
			const node = getNode(ast, arg.espath);
			const statement = computeStatement(node);
			const formatted = concordance.format(arg.value, concordanceOptions);
			return [statement, formatted];
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
