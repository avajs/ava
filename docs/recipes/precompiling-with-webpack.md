## Precompiling source files with webpack

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/precompiling-with-webpack.md)

The AVA [readme](https://github.com/avajs/ava#transpiling-imported-modules) mentions precompiling your imported modules as an alternative to runtime compilation, but it doesn't explain how. This recipe shows how to do this using webpack. (This example uses webpack 2.0)

###### webpack.config.js

```js
const path = require('path');
// To pre-compile folder with multiple test files, we can use glob
// see http://stackoverflow.com/questions/32874025/how-to-add-wildcard-mapping-in-entry-of-webpack/34545812#34545812
// const glob = require('glob');

const nodeExternals = require('webpack-node-externals');

module.exports = {
	entry: ['src/tests.js'],
	// entry: glob.sync('./test/**/*.js'),
	target: 'node',
	output: {
		path: path.resolve(__dirname, '_build'),
		filename: 'tests.js'
	},
	externals: [nodeExternals()],
	module: {
		rules: [{
			test: /\.(js|jsx)$/,
			use: 'babel-loader'
		}]
	}
};
```

The important bits are `target: 'node'`, which ignores Node.js-specific `require`s (e.g. `fs`, `path`, etc.) and `externals: nodeModules` which prevents webpack from trying to bundle external Node.js modules which it may choke on.

You can now run `$ ava _build/tests.js` to run the tests contained in this output.
