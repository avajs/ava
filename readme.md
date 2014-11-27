# ava [![Build Status](https://travis-ci.org/sindresorhus/ava.svg?branch=master)](https://travis-ci.org/sindresorhus/ava)

> Simple concurrent test runner


## Install

```sh
$ npm install --save-dev ava
```


## Usage

##### Add it to `package.json`

```json
{
	"scripts": {
		"test": "ava test.js"
	}
}
```

Ava accepts files/folders/globs.


##### Create your test file

```js
var test = require('ava');

test('test something', function (t) {
	t.assert(true);
	t.is('unicorn', 'unicorn');
	t.end();
});
```

##### Run it

```sh
$ npm test
```


## Credit

[![Sindre Sorhus](http://gravatar.com/avatar/d36a92237c75c5337c17b60d90686bf9?s=144)](http://sindresorhus.com) | [![Kevin Mårtensson](http://gravatar.com/avatar/48fa294e3cd41680b80d3ed6345c7b4d?s=144)](https://github.com/kevva)
---|---
[Sindre Sorhus](http://sindresorhus.com) | [Kevin Mårtensson](https://github.com/kevva)


## License

MIT © Sindre Sorhus, Kevin Mårtensson
