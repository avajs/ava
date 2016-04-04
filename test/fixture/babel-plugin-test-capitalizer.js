module.exports = function (babel) {
	var t = babel.types;

	return {
		visitor: {
			CallExpression: function (path) {
				// skip require calls
				var firstArg = path.get('arguments')[0];
				if (!isRequire(path) && firstArg && firstArg.isStringLiteral() && !/repeated test/.test(firstArg.node.value)) {
					firstArg.replaceWith(t.stringLiteral(firstArg.node.value.toUpperCase()));
				}
			}
		}
	};
};

function isRequire(path) {
	return path.isCallExpression() && path.get('callee').isIdentifier() && (path.get('callee').node.name === 'require');
}
