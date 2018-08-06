open Promise;

test("Promise.test", t =>
  t.notThrowsAsync(() => Js.Promise.resolve())
);
test_failing("Promise.test_failing", t =>
  t.notThrowsAsync(() =>
    Js.Promise.make((~resolve as _, ~reject as _) =>
      Js.Exn.raiseError("Oh no")
    ),
  )
);
after(_ => Js.Promise.resolve());
after_always(_ => Js.Promise.resolve());
after_each(_ => Js.Promise.resolve());
after_each_always(_ => Js.Promise.resolve());
before(_ => Js.Promise.resolve());
before_each(_ => Js.Promise.resolve());
todo("Promise.todo");
