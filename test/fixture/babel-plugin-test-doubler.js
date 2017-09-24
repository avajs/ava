'use strict';
/*
 A Babel plugin that causes each AVA test to be duplicated with a new title.

     test('foo', t => {});

 becomes

     test('foo', t => {});
     test('repeated test: foo', t => {});

  This is used by some integration tests to validate correct handling of Babel config options.
*/

/* eslint-disable new-cap */
module.exports = babel => {
	const t = babel.types;
	let anonCount = 1;

	return {
		visitor: {
			CallExpression: path => {
				const node = path.node;
				const callee = node.callee;
				let args = node.arguments;

				if (callee.type === 'Identifier' && callee.name === 'test') {
					if (args.length === 1) {
						args = [t.StringLiteral(`repeated test: anonymous${anonCount++}`), args[0]];
					} else if (args.length === 2 && args[0].type === 'StringLiteral') {
						if (args[0].value.startsWith('repeated test')) {
							return;
						}

						args = args.slice();
						args[0] = t.StringLiteral(`repeated test: ${args[0].value}`);
					} else {
						throw new Error('The plugin does not know how to handle this call to test');
					}

					path.insertAfter(t.CallExpression(
						t.Identifier('test'),
						args
					));
				}
			}
		}
	};
};
