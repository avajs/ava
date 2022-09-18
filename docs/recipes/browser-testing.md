# Setting up AVA for browser testing

AVA is running in a __Node.js__ environment. JavaScript that runs in a browser will likely expect the browser DOM globals to be in place.
With help from a package called [jsdom](https://github.com/jsdom/jsdom),
you can write unit tests with `ava` also for JavaScript that will run in a browser
and relying on browser specific globals such as `window`, `document` and `navigator`.

## Install jsdom

```bash
npm install --save-dev jsdom
```

## Writing unit tests

Use `jsdom` to set the globals and the DOM elements that the test target is expecting.


### An example Unit Test
The JavaScript code to be tested is doing a DOM query, such as: `document.querySelector('#my-element-id')`.

To make the code testable with `ava`, add the element to `jsdom` and set the global object.

```js
import test from 'ava';
import { JSDOM } from 'jsdom';

test.before(() => {
  const dom = new JSDOM('<div id="my-element-id" />');  // insert any html needed for the unit test suite here
  global.document = dom.window.document; // add the globals needed for the unit tests in this suite.
});

test('this is an example', (t) => {
    const res = myTarget.runFunctionThatExpectsTheDocumentGlobalAndElement();

    t.truthy(res);
});
```

## Important note
In general, adding globals to the `Node.js` environment is [recommended against](https://github.com/jsdom/jsdom/wiki/Don't-stuff-jsdom-globals-onto-the-Node-global) by `jsdom`.
Please read through the linked wiki page and make sure you understand why.
