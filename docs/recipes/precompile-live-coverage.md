With a lot of tests that also require your source code to be transpiled the solution of using babel 
register becomes soon quite slow. Here is a recipe that uses only npm scripts to:

1. Run all your test when your test AND/OR source file changes
1. Compile your source file with babel
1. Output the coverage of your tests
1. Display the HTML report of your coverage
1. Live Reload your coverage so that is possible to see the lines hit by the tests

## Prerequisites: 


```
npm install -D browser-sync
npm install -D chokidar-cli
npm install -D babel-cli
npm install -D nyc

```

## Browsersync configuration 

The essential config to put in browsersync bs-config.js

```
 'files': [
    {
      match: 'coverage/**.*'
    }
  ],
  'watchEvents': [
    'change',
    'add'
  ],
  'watchOptions': {
    'ignoreInitial': true
  },
  'server': true,
  'proxy': false,
  'port': 4000,
  'middleware': false,
  'serveStatic': ['coverage/'],

```

## Package.json configuration

```
"ava": {
    "babel": "inherit",
    "concurrency": 5
  },
  "nyc": {
    "extension": [
      ".es6"
    ],
    "include": [
      "test_src"
    ],
    "sourceMap": true,
    "instrument": true
  },
  "babel": {
    "presets": [
      "es2015",
      "vue"
    ]
  },
"scripts": {
    "clean-test-folder": "rm -rf test_src && mkdir test_src",
    "test-source-watch": "babel . --ignore test/,test_src/,node_modules/,coverage/,*config.js -d test_src -s -watch",
    "pre-test": "yarn clean-test-folder && yarn test-source-compile",
    "test": "yarn pre-test & yarn serve-test & yarn watch-test",
    "serve-test": "browser-sync start --config bs-config.js",
    "watch-test": "chokidar 'test_src' 'test' -c 'yarn run-test'",
    "run-test": "nyc --cache ava; nyc report --reporter=html"
  },
```


## Explaination

Running npm test ( or yarn test ) will do the following: 
1. delete and create again the test_src folder
1. compile your test and output them in the test_src folder and watch for changes
1. Fire a browsersync watching the coverage dir and serving it statically on the localhost:4000
1. Watch the folders **test_src** and **src** for changes and execute your test when any of them change
1. Output the coverage on your terminal and auto refreshing any browser pointing to localhost:4000 when the coverage change

For this to run properly your test should reference the test_src folder when importing js modules and not the original one

This is meant as a starting point but is a minimal working solution, also this is for running the test live locally
and is not going to work on any CI ( But is easy to modify the script to work well in any CI )

