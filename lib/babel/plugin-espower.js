var babel = require('babel-core');
var createEspowerPlugin = require('babel-plugin-espower/create');
var patterns = require('../enhance-assert').PATTERNS;

// initialize power-assert
module.exports = createEspowerPlugin(babel, {
	embedAst: true,
	patterns: patterns
});
