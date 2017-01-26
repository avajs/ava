In the [README](https://github.com/avajs/ava#transpiling-imported-modules) it mentions precompiling your imported modules as an alternative to JIT compilation, but it doesn't explain how. This recipe shows how to do this using webpack.

webpack.config.js
```js
var nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: ['./src/tests.js'],
  target: 'node',
  output: {
    path: '_build',
    filename: 'tests.js'
  },
  externals: nodeModules,
  module: {
    rules: [
      { test: /\.(js|jsx)$/, use: 'babel-loader' }
    ]
  }
};
```

The important bits are `target: 'node'`, which ignores node-specific `require`s (e.g. `fs`, `path`, etc.) and `externals: nodeModules` which prevents webpack from trying to bundle external node librarires which it may choke on.

Now you can simply run `ava _buid/tests.js` to run the tests contained in this output.
