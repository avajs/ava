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

## Test files

Create the following files:

- `./test/bingtest.js`
- `./test/googletest.js`

In both files, let's first include the packages:

```js
const test = require('ava');
const {Builder, By, Key, until} = require('selenium-webdriver');

require('chromedriver');
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

Since we would like to initialize the webdriver before each test, we use the [`beforeEach` and `afterEach`](../01-writing-tests.md#before--after-hooks) hooks to setup and teardown the driver respectively. Using these hooks, helps reduce the amount of code we would write in each `test()`.

```js
test.beforeEach(async t => {
	t.context.driver = new Builder().forBrowser('chrome').build();
	await t.context.driver.get('https://www.google.com');
});

test.afterEach('cleanup', async t => {
	await t.context.driver.close();
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

## Running the tests

Now if we run these tests using `npx ava`, then AVA will execute test files in parallel based on number of CPUs. 
For example, if we run the above command on a laptop with 4 CPU cores, AVA will execute tests in both `bingtest.js` and `googletest.js` files concurrently. See the below output:

```console
DevTools listening on ws://127.0.0.1:49852/devtools/browser/adfcad21-9612-46ff-adc3-09adc0737f4a

DevTools listening on ws://127.0.0.1:49853/devtools/browser/304aab40-c81e-4f26-b19c-5616472d568a

DevTools listening on ws://127.0.0.1:49855/devtools/browser/8f6b7206-ea2b-4d41-b6aa-10a42a562387

  3 tests passed
```

We can change how many test files can run at the same time either via the [`command-line`](../05-command-line.md) or the [`configuration`](../06-configuration.md) section. For example, if our AVA config section looks like this:

```json
{
	"ava":{
		"concurrency": 1,
		"verbose": true
	}
}
```

The `concurrency: 1` value will only allow AVA to run one file at a time. It however cannot control how many tests in that file can run at the same time.

The `verbose: true` value will enable verbose output.

Now if we run the same `npx ava` command:

```console
DevTools listening on ws://127.0.0.1:49720/devtools/browser/9ebf4394-447b-4916-91cc-692d06d88896
  √ bingtest » Bing Search (7.2s)

DevTools listening on ws://127.0.0.1:49756/devtools/browser/6e19d9fe-4de6-40a3-b120-17067b3125ca

DevTools listening on ws://127.0.0.1:49757/devtools/browser/ac12c2da-eeed-40d8-9b23-4d2103ec8fac
  √ googletest » Google Search for avajs (2.5s)
  √ googletest » Google Search for webdriver (3.3s)

  3 tests passed
```

As you can see from the output, AVA ran the `bingtest.js` file first, waited for the only test to complete and then ran `googletest.js` file next where both the tests ran in parallel.
