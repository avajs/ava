# ES Modules

As of Node.js 8.5.0, ES modules are natively supported, behind a command line option `--experimental-modules`.

However, it works a bit different on Node.js than on web browsers that also natively supported ES Modules. In Node.js, you need to write `.mjs` files instead of commonly known `.js` files. The `.mjs` files do work on the web browsers but they have to be served with the correct Media Type (`text/javascript` or `application/javascript`). There is a [ongoing effort](https://tools.ietf.org/html/draft-bfarias-javascript-mjs-00) working on standardizing `.mjs`.

Good news is that there's already a library named [@std/esm](https://github.com/standard-things/esm) that allows you to write and run ES modules with transpiling. It basically does everything the specs says to make ES modules work on Node.js 4.x and above.

`ava` should be able to do right? Yes, it definitely can but it requires a bit more effort to make things work magically!

## @std/esm

First, install [@std/esm](https://github.com/standard-things/esm) first:

```sh
# Install @std/esm
$ npm install --save @std/esm # or yarn add @std/esm
```

Here's all the configuration that you need to write native ES modules with `ava`:

```json
// package.json

{
  ...
  "dependencies": {
    ...
    "@std/esm": ""
  },
  "ava": {
    "require": [
      "@std/esm"
    ]
  },
  "@std/esm": {
    "esm": "all",
    "cjs": true,
    "await": true,
    "gz": true
  }
  ...
}
```

That's basically it. You can now write native ES modules with `ava`.

```js
// test/index.js

import test from 'ava';

test('2 + 2 = 4', async (t) => {
  try {
    t.true(2 + 2 === 4);
  } catch (e) {
    t.fail();
  }
});
```

## @std/esm + Typescript with ts-node

For [TypeScript](https://github.com/Microsoft/TypeScript) users, you can do that too! Let's dive in.

First you will need a NPM package called [ts-node](https://github.com/TypeStrong/ts-node) to replace the `babel-register` that `ava` depends on the transpilation process:

```sh
# Install ts-node
$ npm install --save-dev ts-node # or yarn add -D ts-node
```

Then, add `ts-node` into `ava.require` in `package.json`.

```json
// package.json

{
  ...
  "dependencies": {
    ...
    "@std/esm": ""
  },
  "devDependencies": {
    ...
    "ts-node": ""
  },
  "ava": {
    "require": [
      "ts-node",
      "@std/esm"
    ],
  },
  "@std/esm": {
    "esm": "all",
    "cjs": true,
    "await": true,
    "gz": true
  }
  ...
}
```

Effortless writing test scripts with `ava` + `@std/esm` + `TypeScript` is done!

```ts
// test/index.ts

// @ts-check

import test from 'ava';

test('2 + 2 = 4', async (ts) => {
  try {
    t.true(2 + 2 === 4);
  } catch (e) {
    t.fail();
  }
});
```

## Execute test with ava

```sh
$ ava src/
```

