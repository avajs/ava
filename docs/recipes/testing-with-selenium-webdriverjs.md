# Setting up AVA with Selenium WebDriverJS

This recipe shows you how to use the Selenium WebDriverJS (official JavaScript implementation) with AVA to test web apps.

## Setup

This recipe uses the following packages:

1. [selenium-webdriver](https://www.npmjs.com/package/selenium-webdriver)
2. [chromedriver](https://www.npmjs.com/package/chromedriver)

Install them with:

```console
$ npm install selenium-webdriver chromedriver
```

As part of this recipe, we will use Selenium to verify web searches on [Bing](https://www.bing.com) and [Google](https://www.google.com).

Create the following files:

- `./test/bingtest.js`
- `./test/googletest.js`

In both files, let's first include the packages:

```js
import test from 'ava';
import {Builder, By, Key, until} from 'selenium-webdriver';
import 'chromedriver';
```

In the `bingtest.js` file, add the following code, which tests whether searching for `webdriver` on Bing, returns results.

```js
test('Bing Search', async t => {
	const keyword = 'webdriver';
	const driver = new Builder().forBrowser('chrome').build();
	await driver.get('https://www.bing.com');
	await driver.findElement(By.name('q')).sendKeys(keyword + Key.ENTER);
	await driver.wait(until.titleIs(keyword + ' - Bing'));
	t.true((await driver.findElements(By.css('#b_content #b_results li'))).length > 0);
	await driver.close();
});
```

In the `googletest.js` file, instead of a single test, lets add two tests, one each for the terms 'webdriver' and 'avajs'.

Since we would like to initialize the webdriver before each test, we use `beforeEach` for setup and register cleanup with [`t.teardown()`](../02-execution-context.md#tteardownfn). This keeps the driver available to postconditions and ensures it is closed if setup or the test fails.

```js
test.beforeEach(async t => {
	const driver = new Builder().forBrowser('chrome').build();
	t.context.driver = driver;
	t.teardown(() => driver.close());
	await driver.get('https://www.google.com');
});
```

Now lets add the test code:

```js
async function searchGoogle(driver, keyword) {
	await driver.findElement(By.name('q')).sendKeys(keyword + Key.ENTER);
	await driver.wait(until.titleIs(`${keyword} - Google Search`));
}

test('Google Search for avajs', async t => {
	const {driver} = t.context;
	await searchGoogle(driver, 'avajs');
	t.true((await driver.findElement(By.id('resultStats')).getText()).includes('results'));
});

test('Google Search for webdriver', async t => {
	const {driver} = t.context;
	await searchGoogle(driver, 'webdriver');
	t.true((await driver.findElement(By.id('resultStats')).getText()).includes('results'));
});
```

You're now ready to run the tests. The output should look something like this:

```console
npx ava
DevTools listening on ws://127.0.0.1:49720/devtools/browser/9ebf4394-447b-4916-91cc-692d06d88896

DevTools listening on ws://127.0.0.1:49756/devtools/browser/6e19d9fe-4de6-40a3-b120-17067b3125ca

DevTools listening on ws://127.0.0.1:49757/devtools/browser/ac12c2da-eeed-40d8-9b23-4d2103ec8fac

  bingtest » Bing Search (7.2s)
  googletest » Google Search for avajs (2.5s)
  googletest » Google Search for webdriver (3.3s)

  3 tests passed
```
