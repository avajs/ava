## Setting up AVA with Selenium webdriver

### Setup
To Run Selenium,  JDK needs to be installed on the local machine. [JDK](https://www.oracle.com/technetwork/java/javase/downloads/index.html)

Install [selenium-standalone](https://github.com/vvo/selenium-standalone) and [webdriverio](https://www.npmjs.com/package/webdriverio) in your application.

Once, it is installed. Add the selenium-standalone in you script `package.json`

```
"scripts": {
	"start": "node_modules/.bin/selenium-standalone start",
	"test": "ava --verbose"
}
```
selenium-standalone starts the selenium server. webdriverio connects with the selenium server and runs the headless browser to run testcases.

### Debug

> **_Note:_**  To Run testcases, selenium-standalone should run in background.

```
$ npm run start
```
It should start the seleium-standalone in the cli.
```
$ npm run start

> selenium-standalone start

01:21:33.203 INFO [GridLauncherV3.parse] - Selenium server version: 3.141.5, revision: d54ebd709a
01:21:33.252 INFO [GridLauncherV3.lambda$buildLaunchers$3] - Launching a standalone Selenium Server on port 4444
2019-08-26 01:21:33.291:INFO::main: Logging initialized @224ms to org.seleniumhq.jetty9.util.log.StdErrLog
01:21:33.457 INFO [WebDriverServlet.<init>] - Initialising WebDriverServlet
01:21:33.847 INFO [SeleniumServer.boot] - Selenium Server is up and running on port 4444
Selenium started
```
To Run the testcases, it should contain the webdriver config such as browser name and other [configurations](https://github.com/webdriverio/webdriverio/tree/master/packages/webdriver).

```
let  webdriverio  =  require('webdriverio');

let  client  =  webdriverio.remote({
	// just using a local chromedriver
	desiredCapabilities:  {browserName:  'chrome'}
});
```
webdriver should be initialized with site url and it should be closed after running the test suits.
```
test.before(async  t  => {
	await  client.init()
	.url('SITE_URL');
});

test.after.always(async  t  => {
	await  client.end();
});
```	