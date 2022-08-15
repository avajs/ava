# Setting up AVA for browser testing with puppeteer

This recipe works for any library that needs a real browser environment. The browser environment is provided by Puppeteer (i.e. Chrome). 

## Install puppeteer

```
$ npm install --save-dev puppeteer
```

## Create a headless browser class

Create a class to handle interactions with Puppeteer. 

`headless-browser.js`:

```js
import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';

const puppeteerLaunchArgs = ["--disable-web-security", '--no-sandbox', '--disable-setuid-sandbox'];

export default class HeadlessBrowser {
    puppeteer;
    page;

    static async startBrowser() {
        const browser = new HeadlessBrowser();
        browser.puppeteer = await puppeteer.launch({ args:  puppeteerLaunchArgs});
        browser.page = await browser.puppeteer.newPage();
        await browser.page.setRequestInterception(true)
        browser.page.setDefaultNavigationTimeout(0);
        browser.onConsoleLog((message, type) => console.log(`(${type}): ${message}`))
        return browser;
    }

    async serveJavascriptFile(fileName, filePath = null){
        const javascriptFile = await fs.readFile(filePath ?? fileName, { encoding: 'utf-8' });
        this.addRequestInterceptor(fileName, { contentType: 'application/javascript', body: javascriptFile })
    }

    addRequestInterceptor(urlSearchString, newResponse) {
        this.page.on('request', req => {
            if (req.url().includes(urlSearchString))
                return req.respond(newResponse)
            req.continue()
        })
    }

    onConsoleLog(callback) { this.page.on('console', consoleObj => callback(consoleObj.text(), consoleObj.type())) }

    async runScript(fnToRun, context) {
        let serializedFunction;
        if(context) {
            await this.#exposeContextToBrowser(context)
            serializedFunction = new Function('context', `const fn = ${fnToRun.toString()}; return fn(window['context'])`)
        } else {
            serializedFunction = new Function('noop', `const fn = ${fnToRun.toString()}; return fn()`)
        }
        await this.page.evaluate(serializedFunction);
    }

    close() { this.puppeteer.close() }

    async #exposeContextToBrowser(context){
        await this.page.evaluate(() => {window['context'] = {}}, )
        for (const [key, val] of Object.entries(context)){
            if(typeof val !== 'function'){
                await this.page.evaluate((key, val) => {window['context'][key] = val}, key, val)
                continue;
            }
            const safeFnName = `_exposedFunction_${key}`;
            await this.page.exposeFunction(safeFnName, val)
            await this.page.evaluate((safeFnName, key) => {window['context'][key] = window[safeFnName]}, safeFnName, key)
        }
    }
}
```

## Define a test macro that uses the headless browser

In your test file, import the headless browser class and define a macro that makes use of it.

`test.js`:

```js
import HeadlessBrowser from 'headless-browser.js';
test.before('start browser', async(t) => t.context.browser = await HeadlessBrowser.startBrowser())
const browser = test.macro(async (t, testFunction) => {
    const browser = t.context.browser;

    // Optionally, specify the name and (optionally) path of a javascript file you wish to make available to the browser (i.e. for import in your tests)
    browser.serveJavascriptFile('test.js')

    // Optionally, ensure the browser has access to t.context
    const contextCopy = {...t.context};
    Object.defineProperty(t, 'context', {enumerable:true,writable: true});
    t.context = contextCopy;

    return await browser.runScript(testFunction, t);
})
test.after.always('stop browser', async(t) => t.context.browser.close())
```

# Write tests that execute inside of the headless browser

`test.js`:

```js
test('example test in the browser', browser, async (t) => {
    // This code is running in the browser, with access to ava's 't'.
    t.log('hello from the browser');

    // The browser's console log is forwarded to the test process and visible in the test output
    console.log('Logging to the browser console'); 

    // You may access browser globals like 'window' and 'document'
    document.createElement('a');

    // To avoid syntax errors, imports must be done dynamically
    // const Test = (await import("http://test.js"))['default'];

    t.pass();
})
```
