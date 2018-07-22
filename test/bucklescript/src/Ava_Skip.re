Sync.test_skip("Sync.test_skip", t => t.pass());
Sync.test_failing_skip("Sync.test_failing_skip", t => t.fail());
Sync.Serial.test_skip("Sync.Serial.test_skip", t => t.pass());
/* Sync.Serial.test_failing_skip("Sync.Serial.test_failing_skip", t => t.fail()); */

Async.test_skip("Async.test_skip", t => t.pass());
Async.test_failing_skip("Async.test_failing_skip", t => {
  let error: Js.Exn.t = [%raw {| new Error("Oh no") |}];
  t.cb(~error, ());
});
/* Async.Serial.test_skip("Async.Serial.test_skip", t => t.pass()); */
/* Async.Serial.test_failing_skip("Async.Serial.test_failing_skip", t => {
     let error: Js.Exn.t = [%raw {| new Error("Oh no") |}];
     t.cb(~error, ());
   }); */

Promise.test_skip("Promise.test_skip", t =>
  t.notThrowsAsync(() => Js.Promise.resolve())
);
Promise.test_failing_skip("Promise.test_failing_skip", t =>
  t.notThrowsAsync(() => Js.Promise.make((~resolve as _, ~reject as _) => Js.Exn.raiseError("Oh no")))
);
Promise.Serial.test_skip("Promise.Serial.test_skip", t =>
  t.notThrowsAsync(() => Js.Promise.resolve())
);
/* Promise.Serial.test_failing_skip("Promise.Serial.test_failing_skip", t =>
     t.notThrowsAsync(() => Js.Promise.make((~resolve as _, ~reject as _) => Js.Exn.raiseError("Oh no")))
   ); */
