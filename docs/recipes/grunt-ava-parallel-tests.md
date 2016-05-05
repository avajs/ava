Multi level parallel tests runs where the time taken is only in the order of your longest running test !

##Sample Test harness
https://github.com/subash-canapathy/grunt-ava-parallel-tests

You can use this as a bootstrap test runner / harness to build automated test framework on. It is designed with webdriver/appium end to end tests in mind so that you can run your UI tests with only your grid as the limiting factor.
## Usage
`npm install`

Run the foo bar tests in the package:

`npm test`

OR

`grunt` - if you have grunt installed globally.

### Results

There are 2 test files and each of them have 4 tests in them. Three of the tests use synthetic waits with await (ES6/7 style promise sync shims). If nothing was parallel one run of all the tests in both files will take 8 seconds in total.

![TestResultsWithTime](https://github.com/subash-canapathy/grunt-ava-parallel-tests/blob/master/screenshots/testResultsWithTime.png?raw=true)

Note how much time the tests took in total, it will be approximately in the order of the slowest individual test int the suite. Even though we ran 2 separate combinations of the same suite (all tests) which is in total 16 individual test runs, we apparently ran the two combinations (tasks) concurrently, and then Ava ran the individual javascript files in their own process and the ava process for each file runs the individual tests in parallel ! #mindblowing

The demo tests will also have a basic context usage, where we are logging to console when
* when we get a new driver (with nanotime based ID)
* when a test uses the driver
* when the driver gets cleaned up.

## Organizing test suites

The additional parallel dimension here which is not provided by Ava comes from Grunt. The example uses a grunt plugin (from the developer who wrote Ava) `grunt-concurrent`. Its goal is to take a list of grunt tasks and be able to run them concurrently.
To make sure we can set the environment vars and other configuration options per suite/combination we leverage `grunt-env` and some task compositions to make it work.

Ava test suites are composed in `grunt-shell` blocks (until we have cli options support on `grunt-ava`)
```js
shell: {
  test: {
    command: "npm run ava -- \"src/tests/**/*.js\" --verbose"
  },
  bvt: {
    command: "npm run ava -- \"src/tests/**/*.js\" --match='@bvt*' --verbose"
  }
}
```

Browser/Device (or whatever dimensions your tests might have) are composed using grunt. We can make it very readable this way for eg:
a test suite combination which runs on Device: Nexus7, on local environment, and the ava test suite bvt will be described like this:
```js
grunt.registerTask('Nexus7', function(n) {
    grunt.option('driverCapabilities', "Nexus7");
    grunt.option('driverType', 'AppiumAndroid');
});
grunt.registerTask('run_Android_bvt', ['Nexus7', 'env:local', 'shell:bvt']);
```
