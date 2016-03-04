/*
 A Babel plugin that causes each AVA test to be duplicated with a new title.

     test('foo', t => {});

 becomes

     test('foo', t => {});
     test('repeated test: foo', t => {});

  This is used by some integration tests to validate correct handling of Babel config options.
*/

function plugin(babel) {
	var t = babel.types;
	var anonCount = 1;

	return {
		visitor: {
			CallExpression: function (path) {
				var node = path.node;
				var callee = node.callee;
				var args = node.arguments;
				if (!path.generated && callee.type === 'Identifier' && callee.name === 'test') {
					if (args.length === 1) {
						args = [t.StringLiteral('repeated test: anonymous' + anonCount++), args[0]];
					} else if (args.length === 2 && args[0].type === 'StringLiteral') {
						if (/^repeated test/.test(args[0].value)) {
							return;
						}
						args = args.slice();
						args[0] = t.StringLiteral('repeated test: ' + args[0].value);
					} else {
						throw new Error('the plugin does not know how to handle this call to test');
					}
					path.insertAfter(t.CallExpression(
						t.Identifier('test'),
						args
					));
				}
			}
		}
	};
}

module.exports = plugin;
