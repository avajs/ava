open Sync;

let hook = _ => ();

test("Sync.test", t =>
  t.pass()
);
test_failing("Sync.test_failing", t => t.fail());
after(hook);
after_always(hook);
after_each(hook);
after_each_always(hook);
before(hook);
before_each(hook);
todo("Sync.todo");
