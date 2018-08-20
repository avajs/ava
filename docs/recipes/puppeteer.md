# Testing web apps using Puppeteer

## Dependencies

- [Puppeteer](https://github.com/GoogleChrome/puppeteer)
	- `npm i --save-dev puppeteer`

## Setup

The first step is setting up a helper to configure the environment:

`./test/helpers/setup.js`

```js
const { test } = require('ava');
const puppeteer = require('puppeteer');
const url = "https://google.com"; // App URL, for example, google.com

global.test = test;

test.before(async () => {
  global.browser = await puppeteer.launch();
  global.page = await browser.newPage();
  await page.goto(url);
});

test.after.always(async () => {
  await page.close();
  await browser.close();
});
```

## Usage example

`./test/*`

```js
require('./helpers/setup');

test('page title should contain "Google"', async t => {
  t.true((await page.title()).includes('Google'));
});
```
