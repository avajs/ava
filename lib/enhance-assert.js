'use strict';
const concordance = require('concordance');
const dotProp = require('dot-prop');
const generate = require('@babel/generator').default;
const concordanceOptions = require('./concordance-options').default;

const computeStatement = node => generate(node).code;
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

module.exports.formatter = formatter;
