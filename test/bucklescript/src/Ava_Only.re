Sync.test_only("Sync.test_only", t => t.pass());
Sync.test_failing_only("Sync.test_failing_only", t => t.fail());
Sync.Serial.test_only("Sync.Serial.test_only", t => t.pass());
/* Sync.Serial.test_failing_only("Sync.Serial.test_failing_only", t => t.fail()); */

Async.test_only("Async.test_only", t => t.cb());
Async.test_failing_only("Async.test_failing_only", t => {
  let error: Js.Exn.t = [%raw {| new Error("Oh no") |}];
  t.cb(~error, ());
});
/* Async.Serial.test_only("Async.Serial.test_only", t => t.cb()); */
/* Async.Serial.test_failing_only("Async.Serial.test_failing_only", t => {
     let error : Js.Exn.t = [%raw {| new Error("Oh no") |}];
     t.cb(~error, ());
   }); */

Promise.test_only("Promise.test_only", t =>
  t.notThrowsAsync(() => Js.Promise.resolve())
);
Promise.test_failing_only("Promise.test_failing_only", t =>
  t.notThrowsAsync(() => Js.Promise.make((~resolve as _, ~reject as _) =>
    Js.Exn.raiseError("Oh no")
  ))
);
Promise.Serial.test_only("Promise.Serial.test_only", t =>
  t.notThrowsAsync(() => Js.Promise.resolve())
);
/* Promise.Serial.test_failing_only("Promise.Serial.test_failing_only", t =>
  t.notThrowsAsync(() => Js.Promise.make((~resolve as _, ~reject as _) =>
    Js.Exn.raiseError("Oh no")
  ))
); */
