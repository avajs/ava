# Setting up AVA for browser testing

Translations: [Français](https://github.com/sindresorhus/ava-docs/blob/master/fr_FR/docs/recipes/browser-testing.md), [Italiano](https://github.com/sindresorhus/ava-docs/blob/master/it_IT/recipes/browser-testing.md), [Русский](https://github.com/sindresorhus/ava-docs/blob/master/ru_RU/docs/recipes/browser-testing.md), [简体中文](https://github.com/sindresorhus/ava-docs/blob/master/zh_CN/docs/recipes/browser-testing.md)

AVA does not support running tests in browsers [yet](https://github.com/sindresorhus/ava/issues/24). Some libraries require browser specific globals (`window`, `document`, `navigator`, etc).
An example of this is React, at least if you want to use ReactDOM.render and simulate events with ReactTestUtils.

This recipe works for any library that needs a mocked browser environment.

## Install jsdom

Install [jsdom](https://github.com/tmpvar/jsdom).

> A JavaScript implementation of the WHATWG DOM and HTML standards, for use with node.js

```
$ npm install --save-dev jsdom
```

## Setup jsdom

Create a helper file and place it in the `test/helpers` folder. This ensures AVA does not treat it as a test.

`test/helpers/setup-browser-env.js`:

```js
global.document = require('jsdom').jsdom('<body></body>');
global.window = document.defaultView;
global.navigator = window.navigator;
```

## Configure tests to use jsdom

Configure AVA to `require` the helper before every test file.

`package.json`:

```json
{
  "ava": {
    "require": [
      "./test/helpers/setup-browser-env.js"
    ]
  }
}
```

## Enjoy!

Write your tests and enjoy a mocked window object.

`test/my.react.test.js`:

```js
import test from 'ava';
import React from 'react';
import {render} from 'react-dom';
import {Simulate} from 'react-addons-test-utils';
import sinon from 'sinon';
import CustomInput from './components/custom-input.jsx';

test('Input calls onBlur', t => {
	const onUserBlur = sinon.spy();
	const input = render(
		React.createElement(CustomInput, {onUserBlur),
		div
	)

	Simulate.blur(input);

	t.true(onUserBlur.calledOnce);
});
```
