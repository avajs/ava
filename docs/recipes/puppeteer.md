# Testing web apps using Puppeteer

## Dependencies

- [Puppeteer](https://github.com/GoogleChrome/puppeteer): `npm install --save-dev puppeteer`

## Setup

The first step is setting up a helper to configure the environment:

`./test/helpers/setup.js`

```js
const puppeteer = require('puppeteer');

module.exports = async fn => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	try {
		await fn(page);
	} finally {
		await page.close();
		await browser.close();
	}
}
```

## Usage example

`./test/main.js`

```js
const test = require('ava');
const setup = require('./helpers/setup');

const url = 'https://google.com';

test('page title should contain `Google`', t => {
	return setup(async page => {
		await page.goto(url);
		t.true((await page.title()).includes('Google'));
	});
});

test('page should contain an element with `#hplogo` selector', t => {
	return setup(async page => {
		await page.goto(url);
		t.not(await page.$('#hplogo'), null);
	});
});

test('full page should match the snapshot', t => {
	return setup(async page => {
		await page.goto(url);
		let fullHTML = await page.evaluate(() => document.innerHTML);
		t.snapshot(fullHTML);
	});
});

test('search form should match the snapshot', t => {
	return setup(async page => {
		await page.goto(url);
		let searchForm = (await page.$('#searchform')).innerHTML;
		t.snapshot(searchForm);
	});
});
```
