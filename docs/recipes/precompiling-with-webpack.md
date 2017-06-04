## Precompiling source files with webpack

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/precompiling-with-webpack.md)

The AVA [readme](https://github.com/avajs/ava#transpiling-imported-modules) mentions precompiling your imported modules as an alternative to runtime compilation, but it doesn't explain how. This recipe various approaches using webpack. (These examples use webpack 2.0). Multiple approaches are discussed as each has its own pros and cons. You should select the approach that best fits your use case. This might not be necessery once [this](https://github.com/avajs/ava/blob/master/docs/specs/001%20-%20Improving%20language%20support.md) is completed. See the original discussion [here](/avajs/ava/pull/1385).

- [Single test file](#single-test-file)
- [Multiple test files](#multiple-test-files)

### Single test file
This is the simplest use case. You might need this if you are [using aliases](https://github.com/avajs/ava/issues/1011).

###### webpack.config.js

```js
const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
	entry: ['tests.js'],
	target: 'node',
	output: {
		path: path.resolve(__dirname, '_build'),
		filename: 'tests.js'
	},
	externals: [nodeExternals()],
	module: {
		rules: [{
			test: /\.(js|jsx)$/,
			use: 'babel-loader',
			options: { cacheDirectory: true }
		}]
	}
};
```

The important bits are `target: 'node'`, which ignores Node.js-specific `require`s (e.g. `fs`, `path`, etc.) and `externals: nodeModules` which prevents webpack from trying to bundle external Node.js modules which it may choke on.

You can now run `$ ava _build/tests.js` to run the tests contained in this output.

### Multiple test files
Things are a little more complicated with multiple test files. We recommend [using babel-register](babelrc.md) until the performance penalty becomes too great.

The possible approaches are:

- [Refer precompiled source in tests](#refer-precompiled-source-in-tests)
- [Single entry file](#single-entry-file)
- [Multiple entry files](#multiple-entry-files)
- [Multiple entry files with externalized source files](#multiple-entry-files-with-externalized-source-files)

#### Refer precompiled source in tests
Source files can be compiled with source maps(for coverage) to `_src` folder and referenced in tests. While this is less than elegant, it performs well and the worklow can be optimized with [webpack's watch mode](https://webpack.js.org/configuration/watch/).

```js
// Before
import fresh from '../src';
// After
import fresh from '../_src';
```

#### Single entry file
To pre-compile folder with multiple test files, we can use globbing(see [stackoverflow answer](http://stackoverflow.com/questions/32874025/how-to-add-wildcard-mapping-in-entry-of-webpack/34545812#34545812)). Although this performs quite possibly the best, it comes at a cost. AVA uses the filename and path for test names in verbose mode as well as test failure reports. This can make the error report harder to understand. Also, it can matter if tests modify globals, Node.js built-ins. You wouldn't want that to leak across tests.

###### webpack.config.js

```js
const path = require('path');
const glob = require('glob');

const nodeExternals = require('webpack-node-externals');

module.exports = {
	target: 'node',
	entry: glob.sync('./test/**/*.js'),
	output: {
		path: path.resolve(__dirname, '_build'),
		filename: 'tests.js'
	},
	externals: [nodeExternals()],
	module: {
		rules: [{
			test: /\.(js|jsx)$/,
			use: {
				loader: 'babel-loader',
				options: { cacheDirectory: true }
			}
		}]
	}
};
```

<details>
<summary>Error report comparison</summary>

```
# Before
  aggregations-test » cardinality-agg » sets precision_threshold option
  E:\Projects\repos\elastic-builder\test\_macros.js:167

   166:         const expected = getExpected(keyName, recursiveToJSON(propValue));
   167:         t.deepEqual(value, expected);
   168:     }

  Difference:

      Object {
        my_agg: Object {
          cardinality: Object {
    -       precision_threshol: 5000,
    +       precision_threshold: 5000,
          },
        },
      }

# After
  sets precision_threshold option
  E:\Projects\repos\elastic-builder\_build\tests.js:106

   105:                     column: 21
   106:                 }
   107:             },

  Difference:

      Object {
        my_agg: Object {
          cardinality: Object {
    -       precision_threshol: 5000,
    +       precision_threshold: 5000,
          },
        },
      }

```

</details>

#### Multiple entry files
We can ask webpack to generate multiple entry files. This helps retain file names so that error reports are easy to interpret. But each entry file gets it's own copy of the source files. This results in considerably larger file sizes. This can [perform quite poorly](https://github.com/avajs/ava/pull/1385#issuecomment-304684047) on the first execution.

###### webpack.config.js

```js
const path = require('path');
const glob = require('glob');

const nodeExternals = require('webpack-node-externals');

const testFiles = glob.sync('./test/**/*.js');

const entryObj = {};
const len = testFiles.length;
for (let idx = 0; idx < len; idx++) {
	const file = testFiles[idx];
	entryObj[path.basename(file, path.extname(file))] = file;
}

module.exports = {
	target: 'node',
	entry: entryObj,
	output: {
		path: path.resolve(__dirname, '_build'),
		filename: '[name].js'
	},
	externals: [nodeExternals()],
	module: {
		rules: [{
			test: /\.(js|jsx)$/,
			use: {
				loader: 'babel-loader',
				options: { cacheDirectory: true }
			}
		}]
	}
};
```

#### Multiple entry files with externalized source files
This is the most complicated to setup but performs quite well and also retains file names. In this approach, we use the babel cli to compile the src files but preserve file structure. Then we compile the tests with a require path rewrite. The following example is for a specific file structure. Depending on how your source and test files are organised, you might need to make changes.

File structure:
```
├───src
│	├───my-pkg-fldr
│	│	├───my-module.js
│	│	└───index.js
│	└───index.js
└───test
	├───my-pkg-fldr
	│	└───my-module.test.js
	└───index.test.js

# Generated file structure
├───_src
│	├───my-pkg-fldr
│	│	├───my-module.js
│	│	└───index.js
│	└───index.js
└───_build
	├───my-module.test.js
	└───index.test.js
```

npm scripts:
```js
{
  "scripts": {
    "precompile-src": "cross-env NODE_ENV=test babel src --out-dir _src",
    "precompile-tests": "cross-env NODE_ENV=test webpack --config webpack.config.test.js",
    "pretest": "npm run precompile-src && npm run precompile-tests",
    "test": "cross-env NODE_ENV=test nyc --cache ava _build --concurrency 3"
  }
}
```

###### webpack.config.js

Webpack Externals Docs - https://webpack.js.org/configuration/externals/#function

```js
const path = require('path');
const glob = require('glob');

const nodeExternals = require('webpack-node-externals');

const testFiles = glob.sync('./test/**/*.js');

const entryObj = {};
const len = testFiles.length;
for (let idx = 0; idx < len; idx++) {
	const file = testFiles[idx];
	entryObj[path.basename(file, path.extname(file))] = file;
}

module.exports = {
	target: 'node',
	entry: entryObj,
	output: {
		path: path.resolve(__dirname, '_build'),
		filename: '[name].js'
	},
	externals: [
		nodeExternals(),
		// Rewrite the require paths to use _src
		(context, request, callback) => {
			// This is a little messy because tests are not output in original file structure
			// test/index.test.js -> _build/index.test.js
				// => ../src -> ../_src
			// test/my-pkg-fldr/my-module.test.js -> _build/my-module.test.js
				// => ../../src -> ../_src
			if (request.includes('/src')) {
				const requestReqwrite = request
					.replace('/src', '/_src')
					.replace('../../_src', '../_src');
				return callback(null, `commonjs ${requestReqwrite}`);
			}
			callback();
		}
	]
};
```

