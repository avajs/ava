open Promise;

test("Promise.test#t.pass", t => {
  t.pass();
  Js.Promise.resolve();
});
test_failing("Promise.test_failing#t.fail", t => {
  t.pass();
  Js.Promise.make((~resolve as _, ~reject as _) =>
    Js.Exn.raiseError("Oh no")
  );
});

 test("Promise.test#t.truthy", t =>
  {
    t.truthy(true);
    Js.Promise.resolve();
  }
);
test("Promise.test#t.falsy", t =>
  {t.falsy(false);

    Js.Promise.resolve();
  }
);

type user = {
  name: string,
  age: int,
};

test("Promise.test#t.is", t => {
  let actual = {name: "user", age: 0};
  let expected = actual;
  t.is(expected, actual);
  Js.Promise.resolve();
});

test("Promise.test#t.not", t => {
  let actual = {name: "user", age: 0};
  let expected = {name: "user", age: 0};
  t.not(expected, actual);
  Js.Promise.resolve();
});

test("Promise.test#t.deepEqual", t => {
  let actual = {name: "user", age: 0};
  let expected = {name: "user", age: 0};
  t.deepEqual(expected, actual);
  Js.Promise.resolve();
});

test("Promise.test#t.notDeepEqual", t => {
  let actual = {name: "user0", age: 0};
  let expected = {name: "user1", age: 1};
  t.notDeepEqual(expected, actual);
  Js.Promise.resolve();
});

test("Promise.test#t.throws", t => {
  t.throws(() => {
    Js.Exn.raiseError("Oh no")
  });
});

test("Promise.test#t.notThrows", t => {
  t.notThrows(() => ());
});

test("Promise.test#t.throwsAsync", t => {
  t.throwsAsync(() => Js.Promise.make((~resolve as _, ~reject as _) =>
    Js.Exn.raiseError("Oh no")
  ));
});

test("Promise.test#t.notThrowsAsync", t => {
  t.notThrowsAsync(() => Js.Promise.resolve());
});

test("Promise.test#t.regex", t => {
  t.regex([%re "/^regex$/i"], "regex");
  Js.Promise.resolve();
});

test("Promise.test#t.notRegex", t => {
  t.notRegex([%re "/^regex$/i"], "regexp");
  Js.Promise.resolve();
});
