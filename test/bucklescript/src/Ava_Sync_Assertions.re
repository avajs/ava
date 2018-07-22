open Sync;

test("Sync.test#t.pass", t =>
  t.pass()
);
test_failing("Sync.test_failing#t.fail", t => t.fail());

test("Sync.test#t.truthy", t =>
  t.truthy(true)
);
test("Sync.test#t.falsy", t =>
  t.falsy(false)
);

type user = {
  name: string,
  age: int,
};

test("Sync.test#t.is", t => {
  let actual = {name: "user", age: 0};
  let expected = actual;
  t.is(expected, actual);
});

test("Sync.test#t.not", t => {
  let actual = {name: "user", age: 0};
  let expected = {name: "user", age: 0};
  t.not(expected, actual);
});

test("Sync.test#t.deepEqual", t => {
  let actual = {name: "user", age: 0};
  let expected = {name: "user", age: 0};
  t.deepEqual(expected, actual);
});

test("Sync.test#t.notDeepEqual", t => {
  let actual = {name: "user0", age: 0};
  let expected = {name: "user1", age: 1};
  t.notDeepEqual(expected, actual);
});

test("Sync.test#t.throws", t => {
  t.throws(() => {
    Js.Exn.raiseError("Oh no")
  });
});

test("Sync.test#t.notThrows", t => {
  t.notThrows(() => ());
});

test("Sync.test#t.regex", t => {
  t.regex([%re "/^regex$/i"], "regex");
});

test("Sync.test#t.notRegex", t => {
  t.notRegex([%re "/^regex$/i"], "regexp");
});
