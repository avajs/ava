## Precompiling source files with webpack

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/precompiling-with-webpack.md)

The AVA [readme](https://github.com/avajs/ava#transpiling-imported-modules) mentions precompiling your imported modules as an alternative to runtime compilation, but it doesn't explain how. This recipe discusses several approaches using webpack v2. Multiple approaches are discussed as each has its own pros and cons. You should select the approach that best fits your use case. See the original discussion [here](https://github.com/avajs/ava/pull/1385).

- [Single test file](#single-test-file)
- [Multiple test files](#multiple-test-files)

### Single test file

This is the simplest use case. You might need this if you are [using aliases](https://github.com/avajs/ava/issues/1011).

###### `webpack.config.js`

```js
const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
	entry: ['test.js'],
	target: 'node',
	output: {
		path: path.resolve(__dirname, '_build'),
		filename: 'test.js'
	},
	externals: [nodeExternals()],
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				use: 'babel-loader',
				options: {
					cacheDirectory: true
				}
			}
		]
	}
};
```

The important bits are `target: 'node'`, which ignores Node.js-specific `require`s (e.g. `fs`, `path`, etc.) and `externals: nodeModules` which prevents webpack from trying to bundle external Node.js modules which it may choke on.

You can now run `$ ava _build/test.js` to run the tests contained in this output.

### Multiple test files

Things are a little more complicated with multiple test files. We recommend [using babel-register](babelrc.md) until the performance penalty becomes too great.

The possible approaches are:

- [Refer precompiled source in tests](#refer-precompiled-source-in-tests)
- [Single entry file](#single-entry-file)
- [Multiple entry files](#multiple-entry-files)
- [Test against precompiled sources](#test-against-precompiled-sources)

#### Refer precompiled source in tests

Source files can be compiled to `_src` folder and referenced in tests. While this is less than elegant, it performs well and the workflow can be optimized with [`babel-cli` watch mode](https://babeljs.io/docs/usage/cli/#babel).

```js
// Before
import fresh from '../src';
// After
import fresh from '../_src';
```

#### Single entry file

Multiple test files can be compiled into a single file. This may have the best performance, but it does come at a cost. All tests will be in the same file, which can make it harder to know which test has failed, since AVA can't show the file name the test was originally in. You'll also lose [process isolation](https://github.com/avajs/ava#process-isolation).

###### `webpack.config.js`

[Related Stack Overflow answer](http://stackoverflow.com/questions/32874025/how-to-add-wildcard-mapping-in-entry-of-webpack/34545812#34545812)

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
		rules: [
			{
				test: /\.(js|jsx)$/,
				use: {
					loader: 'babel-loader',
					options: {
						cacheDirectory: true
					}
				}
			}
		]
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

We can ask webpack to generate multiple entry files. This helps retain file names so that error reports are easy to interpret. But each entry file gets its own copy of the source files. This results in considerably larger file sizes. This can [perform quite poorly](https://github.com/avajs/ava/pull/1385#issuecomment-304684047) on the first execution.

###### `webpack.config.js`

```js
const path = require('path');
const glob = require('glob');
const nodeExternals = require('webpack-node-externals');

const entryObj = glob.sync('./test/**/*.js')
	.reduce((acc, file) => {
		acc[path.basename(file, path.extname(file))] = file;
		return acc;
	}, {});

module.exports = {
	target: 'node',
	entry: entryObj,
	output: {
		path: path.resolve(__dirname, '_build'),
		filename: '[name].js'
	},
	externals: [nodeExternals()],
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				use: {
					loader: 'babel-loader',
					options: {
						cacheDirectory: true
					}
				}
			}
		]
	}
};
```

#### Test against precompiled sources

This is the most complicated to setup but performs quite well and also retains file names. In this approach, we use the `babel-cli` to compile the source files but preserve file structure. Require paths in tests are rewritten when compiling them in webpack. The following example is for a specific file structure. Depending on how your source and test files are organised, you might need to make changes.

File structure:

```
├───src
│   ├───my-pkg-fldr
│   │   ├───my-module.js
│   │   └───index.js
│   └───index.js
└───test
    ├───my-pkg-fldr
    │   └───my-module.test.js
    └───index.test.js

# Generated file structure
├───_src
│   ├───my-pkg-fldr
│   │   ├───my-module.js
│   │   └───index.js
│   └───index.js
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

###### `webpack.config.js`

[Webpack `externals` docs](https://webpack.js.org/configuration/externals/#function)

```js
const path = require('path');
const glob = require('glob');
const nodeExternals = require('webpack-node-externals');

const entryObj = glob.sync('./test/**/*.js')
	.reduce((acc, file) => {
		acc[path.basename(file, path.extname(file))] = file;
		return acc;
	}, {});

module.exports = {
	target: 'node',
	entry: entryObj,
	output: {
		path: path.resolve(__dirname, '_build'),
		filename: '[name].js'
	},
	externals: [
		nodeExternals(),
		// Rewrite the require paths to use `_src`
		(context, request, callback) => {
			// This is a little messy because tests are not output in original file structure
			// test/index.test.js → _build/index.test.js
				//=> ../src → ../_src
			// test/my-pkg-fldr/my-module.test.js → _build/my-module.test.js
				//=> ../../src → ../_src
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
