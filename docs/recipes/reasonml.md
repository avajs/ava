# [ReasonML](https://reasonml.github.io) / [BuckleScript](https://bucklescript.github.io)

## Installation

```sh
npm install --save-dev ava
```

Then add `ava` to `bs-dev-dependencies` in your `bsconfig.json`:
```js
{
  ...
  "bs-dev-dependencies": ["ava"]
}
```

## Getting started

```ml
open Sync;

test("1 equals 1", t => {
  t.deepEqual(1, 1);
});
```

```ml
open Async;

test("setTimeout call callback", t => {
  Js.Global.setTimeout(() => t.cb(), 1000)
  |> ignore
});
```

```ml
open Promise;

test("function returns a fulfilled promise", t => {
  t.notThrowsAsync(() => Js.Promise.resolve(true));
});
```
