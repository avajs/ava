open Internal;

[@bs.send] external _pass : promiseExecutionContextJS => unit = "pass";
[@bs.send] external _fail : promiseExecutionContextJS => unit = "fail";
[@bs.send] external _truthy : (promiseExecutionContextJS, bool) => unit = "truthy";
[@bs.send] external _falsy : (promiseExecutionContextJS, bool) => unit = "falsy";
[@bs.send] external _is : (promiseExecutionContextJS, 'a, 'a) => unit = "is";
[@bs.send] external _not : (promiseExecutionContextJS, 'a, 'a) => unit = "not";
[@bs.send] external _deepEqual : (promiseExecutionContextJS, 'a, 'a) => unit = "deepEqual";
[@bs.send] external _notDeepEqual : (promiseExecutionContextJS, 'a, 'a) => unit = "notDeepEqual";
[@bs.send]
external _throws :
  (promiseExecutionContextJS, unit => unit) => Js.Promise.t(unit) =
  "throws";
[@bs.send]
external _notThrows :
  (promiseExecutionContextJS, unit => unit) => Js.Promise.t(unit) =
  "notThrows";
[@bs.send]
external _throwsAsync :
  (promiseExecutionContextJS, unit => Js.Promise.t('a)) => Js.Promise.t(unit) =
  "throwsAsync";
[@bs.send]
external _notThrowsAsync :
  (promiseExecutionContextJS, unit => Js.Promise.t('a)) => Js.Promise.t(unit) =
  "notThrowsAsync";
[@bs.send] external _regex : (promiseExecutionContextJS, string, Js.Re.t) => unit = "regex";
[@bs.send] external _notRegex : (promiseExecutionContextJS, string, Js.Re.t) => unit = "notRegex";
[@bs.send]
external _end :
  (promiseExecutionContextJS, Js.Nullable.t(Js.Exn.t)) => unit =
  "end";

let makePromiseExecutionContext =
    (promiseExecutionContextJS: promiseExecutionContextJS)
    : promiseExecutionContext => {
  pass: () => _pass(promiseExecutionContextJS),
  fail: () => _fail(promiseExecutionContextJS),
  truthy: actual => _truthy(promiseExecutionContextJS, actual),
  falsy: actual => _falsy(promiseExecutionContextJS, actual),
  is: (expected, actual) => _is(promiseExecutionContextJS, actual, expected),
  not: (expected, actual) => _not(promiseExecutionContextJS, actual, expected),
  deepEqual: (expected, actual) => _deepEqual(promiseExecutionContextJS, actual, expected),
  notDeepEqual: (expected, actual) => _notDeepEqual(promiseExecutionContextJS, actual, expected),
  throws: (task) => _throws(promiseExecutionContextJS, task),
  notThrows: (task) => _notThrows(promiseExecutionContextJS, task),
  throwsAsync: thrower =>
    _throwsAsync(promiseExecutionContextJS, thrower),
  notThrowsAsync: nonThrower =>
    _notThrowsAsync(promiseExecutionContextJS, nonThrower),
  regex: (regex, content) => _regex(promiseExecutionContextJS, content, regex),
  notRegex: (regex, content) => _notRegex(promiseExecutionContextJS, content, regex),
};
let makePromiseImplementationResultJS:
  promiseImplementationResultJS('a) => promiseImplementationResult('a) =
  result => result;
let makePromiseImplementation = (promiseImplementation, t) =>
  t
  |> makePromiseExecutionContext
  |> promiseImplementation
  |> makePromiseImplementationResultJS;

[@bs.module]
external _test :
  (string, promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "../../..";
let test: promiseInterface('a) =
  (message, implementation) =>
    _test(message, implementation |> makePromiseImplementation);

[@bs.module "../../.."]
external _test_failing :
  (string, promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "failing";
let test_failing: failingPromiseInterface('a) =
  (message, implementation) =>
    _test_failing(message, implementation |> makePromiseImplementation);

[@bs.module "../../.."]
external _test_only :
  (string, promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "only";
let test_only: onlyPromiseInterface('a) =
  (message, implementation) =>
    _test_only(message, implementation |> makePromiseImplementation);

[@bs.module "../../.."] [@bs.scope "failing"]
external _test_failing_only :
  (string, promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "only";
let test_failing_only: onlyPromiseInterface('a) =
  (message, implementation) =>
    _test_failing_only(
      message,
      implementation |> makePromiseImplementation,
    );

[@bs.module "../../.."]
external _test_skip :
  (string, promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "skip";
let test_skip: skipPromiseInterface('a) =
  (message, implementation) =>
    _test_skip(message, implementation |> makePromiseImplementation);

[@bs.module "../../.."] [@bs.scope "failing"]
external _test_failing_skip :
  (string, promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "skip";
let test_failing_skip: skipPromiseInterface('a) =
  (message, implementation) =>
    _test_failing_skip(
      message,
      implementation |> makePromiseImplementation,
    );

[@bs.module "../../.."]
external _after : (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "after";
let after: hookPromiseInterface('a) =
  implementation => _after(implementation |> makePromiseImplementation);

[@bs.module "../../.."] [@bs.scope "after"]
external _after_always :
  (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "always";
let after_always: hookPromiseInterface('a) =
  implementation =>
    _after_always(implementation |> makePromiseImplementation);

[@bs.module "../../.."]
external _after_each :
  (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "afterEach";
let after_each: hookPromiseInterface('a) =
  implementation => _after(implementation |> makePromiseImplementation);

[@bs.module "../../.."] [@bs.scope "afterEach"]
external _after_each_always :
  (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "always";
let after_each_always: hookPromiseInterface('a) =
  implementation =>
    _after_each_always(implementation |> makePromiseImplementation);

[@bs.module "../../.."]
external _before : (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "before";
let before: hookPromiseInterface('a) =
  implementation => _before(implementation |> makePromiseImplementation);

[@bs.module "../../.."] [@bs.scope "before"]
external _before_always :
  (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "always";
let before_always: hookPromiseInterface('a) =
  implementation =>
    _before_always(implementation |> makePromiseImplementation);

[@bs.module "../../.."]
external _before_each :
  (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "beforeEach";
let before_each: hookPromiseInterface('a) =
  implementation =>
    _before_each(implementation |> makePromiseImplementation);

[@bs.module "../../.."] [@bs.scope "beforeEach"]
external _before_each_always :
  (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
  "always";
let before_each_always: hookPromiseInterface('a) =
  implementation =>
    _before_each_always(implementation |> makePromiseImplementation);

[@bs.module "../../.."]
external _todo : string => unit = "todo";
let todo: todoDeclaration = message => _todo(message);

module Serial = {
  [@bs.module "../../.."]
  external _test :
    (string, promiseExecutionContextJS => Js.Promise.t('a)) => unit =
    "serial";
  let test: promiseInterface('a) =
    (message, implementation) =>
      _test(message, implementation |> makePromiseImplementation);

  [@bs.module "../../.."]
  external _test_failing :
    (string, promiseExecutionContextJS => Js.Promise.t('a)) => unit =
    "failing";
  let test_failing: failingPromiseInterface('a) =
    (message, implementation) =>
      _test_failing(message, implementation |> makePromiseImplementation);

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _test_only :
    (string, promiseExecutionContextJS => Js.Promise.t('a)) => unit =
    "only";
  let test_only: onlyPromiseInterface('a) =
    (message, implementation) =>
      _test_only(message, implementation |> makePromiseImplementation);

  /* [@bs.module "../../.."] [@bs.scope ("serial", "failing")]
      external _test_failing_only :
        (string, promiseExecutionContextJS => Js.Promise.t('a)) => unit =
        "only";
      let test_failing_only: onlyPromiseInterface('a) =
        (message, implementation) =>
          _test_failing_only(
            message,
            implementation |> makePromiseImplementation,
          ); */

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _test_skip :
    (string, promiseExecutionContextJS => Js.Promise.t('a)) => unit =
    "skip";
  let test_skip: skipPromiseInterface('a) =
    (message, implementation) =>
      _test_skip(message, implementation |> makePromiseImplementation);

  /* [@bs.module "../../.."] [@bs.scope ("serial", "failing")]
      external _test_failing_skip :
        (string, promiseExecutionContextJS => Js.Promise.t('a)) => unit =
        "skip";
      let test_failing_skip: skipPromiseInterface('a) =
        (message, implementation) =>
          _test_failing_skip(
            message,
            implementation |> makePromiseImplementation,
          ); */

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _after : (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
    "after";
  let after: hookPromiseInterface('a) =
    implementation => _after(implementation |> makePromiseImplementation);

  [@bs.module "../../.."] [@bs.scope ("serial", "after")]
  external _after_always :
    (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
    "always";
  let after_always: hookPromiseInterface('a) =
    implementation =>
      _after_always(implementation |> makePromiseImplementation);

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _after_each :
    (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
    "afterEach";
  let after_each: hookPromiseInterface('a) =
    implementation => _after(implementation |> makePromiseImplementation);

  [@bs.module "../../.."] [@bs.scope ("serial", "afterEach")]
  external _after_each_always :
    (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
    "always";
  let after_each_always: hookPromiseInterface('a) =
    implementation =>
      _after_each_always(implementation |> makePromiseImplementation);

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _before : (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
    "before";
  let before: hookPromiseInterface('a) =
    implementation => _before(implementation |> makePromiseImplementation);

  [@bs.module "../../.."] [@bs.scope ("serial", "before")]
  external _before_always :
    (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
    "always";
  let before_always: hookPromiseInterface('a) =
    implementation =>
      _before_always(implementation |> makePromiseImplementation);

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _before_each :
    (promiseExecutionContextJS => Js.Promise.t('a)) => unit =
    "beforeEach";
  let before_each: hookPromiseInterface('a) =
    implementation =>
      _before_each(implementation |> makePromiseImplementation);

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _todo : string => unit = "todo";
  let todo: todoDeclaration = message => _todo(message);
};
