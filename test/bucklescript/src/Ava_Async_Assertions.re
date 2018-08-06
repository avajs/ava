open Async;

test("Async.test#t.pass", t =>
  t.cb()
);
test_failing("Async.test_failing#t.fail", t => t.fail());
test("Async.test#t.truthy", t =>{
  t.truthy(true);
  t.cb();
});
test("Async.test#t.falsy", t =>  {
  t.falsy(false);
  t.cb();
});

type user = {
  name: string,
  age: int,
};

test("Async.test#t.is", t => {
  let actual = {name: "user", age: 0};
  let expected = actual;
  t.is(expected, actual);
  t.cb();
});

test("Async.test#t.not", t => {
  let actual = {name: "user", age: 0};
  let expected = {name: "user", age: 0};
  t.not(expected, actual);
  t.cb();
});

test("Async.test#t.deepEqual", t => {
  let actual = {name: "user", age: 0};
  let expected = {name: "user", age: 0};
  t.deepEqual(expected, actual);
  t.cb();
});

test("Async.test#t.notDeepEqual", t => {
  let actual = {name: "user0", age: 0};
  let expected = {name: "user1", age: 1};
  t.notDeepEqual(expected, actual);
  t.cb();
});

test("Async.test#t.throws", t => {
  t.throws(() => {
    Js.Exn.raiseError("Oh no")
  });
  t.cb();
});

test("Async.test#t.notThrows", t => {
  t.notThrows(() => ());
  t.cb();
});

test("Async.test#t.regex", t => {
  t.regex([%re "/^regex$/i"], "regex");
  t.cb();
});

test("Async.test#t.notRegex", t => {
  t.notRegex([%re "/^regex$/i"], "regexp");
  t.cb();
});
