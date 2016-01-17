# Code coverage

As AVA [spawns the test files][isolated-env], you can't use [`istanbul`] for code coverage; instead, you can achieve this with [`nyc`] which is basically [`istanbul`] with sub-process support. So, firstly we'll need to install it:

```
npm install nyc --save-dev
```

For both ES2015 and ES5 environments, don't forget to add `.nyc_output` & `coverage` to your `.gitignore`.


## ES5 coverage

To cover ES5, simply prepend your test script with `nyc`. This npm script will then handle our code coverage and testing:

```json
{
	"scripts": {
		"test": "nyc ava"
	}
}
```


## ES2015 coverage

First, we'll need a babel configuration. This will vary from developer to developer but you can use this `package.json` configuration for babel as a starting point:

```json
{
	"babel": {
		"presets": ["es2015"],
		"plugins": ["transform-runtime"],
		"ignore": "test.js",
		"env": {
			"development": {
				"sourceMaps": "inline"
			}
		}
	}
}
```

Note that in development mode, we need to specify a sourcemap when we transpile our code, and in production this is unnecessary. So for your production script, use an environment other than development; for example:

```json
{
	"scripts": {
		"build": "BABEL_ENV=production babel --out-dir=dist index.js"
	}
}
```

To cover ES6, simply prepend your test script with `nyc` and the `--babel` flag. This npm script will then handle our code coverage and testing:

```json
{
	"scripts": {
		"test": "nyc --babel --reporter=text ava"
	}
}
```


## HTML reports

To see a HTML report for either the ES6 or ES5 coverage strategies we have outlined, do:

```
nyc report --reporter=html
```

Or, convert it into an npm script for less typing:

```json
{
	"scripts": {
		"report": "nyc report --reporter=html"
	}
}
```

This will output a HTML file to the `coverage` directory.


## Hosted coverage

### Travis CI & Coveralls

Firstly, you will need to activate your repository in the coveralls user interface. Once that is done, add [`coveralls`] as a development dependency:

```
npm install coveralls --save-dev
```

Then add the following to your `.travis.yml`:

```
after_success:
	- './node_modules/.bin/nyc report --reporter=text-lcov | ./node_modules/.bin/coveralls'
```

Your coverage report will then appear on coveralls shortly after the CI service completes.

[`babel`]:      https://github.com/babel/babel
[`coveralls`]:  https://github.com/nickmerwin/node-coveralls
[isolated-env]: https://github.com/sindresorhus/ava#isolated-environment
[`istanbul`]:   https://github.com/gotwarlost/istanbul
[`nyc`]:        https://github.com/bcoe/nyc
