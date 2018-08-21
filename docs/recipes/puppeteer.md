# Testing web apps using Puppeteer

## Dependencies

- [Puppeteer](https://github.com/GoogleChrome/puppeteer)
	- `npm i --save-dev puppeteer`

## Setup

The first step is setting up a helper to configure the environment:

`./test/helpers/setup.js`

```js
const puppeteer = require('puppeteer');
const url = "https://google.com"; // App URL, for example, google.com

module.exports = test => {
  test.before(async t => {
    t.context.browser = await puppeteer.launch();
    t.context.page = await t.context.browser.newPage();
    await t.context.page.goto(url);
  });

  test.after.always(async t => {
    await t.context.page.close();
    await t.context.browser.close();
  });
}
```

## Usage example

`./test/*`

```js
const test = require("ava");
const setup = require('./helpers/setup');

setup(test);

test('page title should contain "Google"', async t => {
  t.true((await t.context.page.title()).includes('Google'));
});
```
