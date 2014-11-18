# ava [![Build Status](https://travis-ci.org/sindresorhus/ava.svg?branch=master)](https://travis-ci.org/sindresorhus/ava)

> WIP - Simple concurrent test runner


## Install

```sh
$ npm install --save-dev ava
```


## Usage

##### Add it to `package.json`

```json
{
	"scripts": {
		"test": "ava"
	}
}
```

##### Create your test file

```js
var test = require('ava');

test('test something', function (t) {
	t.plan(1);
	t.assert(true);
});
```

##### Run it

```sh
$ npm test
```


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
