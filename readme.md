# ![AVA](media/header.png)

> Simple concurrent test runner

[![Build Status](https://travis-ci.org/sindresorhus/ava.svg?branch=master)](https://travis-ci.org/sindresorhus/ava)

<img width="288" align="right" src="screenshot.png">

## Install

```
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

Ava accepts files/folders/globs.


##### Create your test file

```js
var test = require('ava');

test('test something', function (t) {
	t.is('unicorn', 'unicorn');
	t.end();
});
```

##### Run it

```
$ npm test
```


## Credit

[![Sindre Sorhus](http://gravatar.com/avatar/d36a92237c75c5337c17b60d90686bf9?s=120)](http://sindresorhus.com) | [![Kevin Mårtensson](http://gravatar.com/avatar/48fa294e3cd41680b80d3ed6345c7b4d?s=120)](https://github.com/kevva)
---|---
[Sindre Sorhus](http://sindresorhus.com) | [Kevin Mårtensson](https://github.com/kevva)


## License

MIT © Sindre Sorhus, Kevin Mårtensson


<div align="center">
	<br>
	<br>
	<br>
	<img src="https://cdn.rawgit.com/sindresorhus/ava/2dba39f904b6b771fae390e3c294bd1dccfe1ec2/media/logo.svg" width="200" alt="AVA">
	<br>
	<br>
</div>
