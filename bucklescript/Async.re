open Internal;

[@bs.send] external _cb_pass : cbExecutionContextJS => unit = "pass";
[@bs.send] external _cb_fail : cbExecutionContextJS => unit = "fail";
[@bs.send] external _truthy : (cbExecutionContextJS, bool) => unit = "truthy";
[@bs.send] external _falsy : (cbExecutionContextJS, bool) => unit = "falsy";
[@bs.send] external _is : (cbExecutionContextJS, 'a, 'a) => unit = "is";
[@bs.send] external _not : (cbExecutionContextJS, 'a, 'a) => unit = "not";
[@bs.send] external _deepEqual : (cbExecutionContextJS, 'a, 'a) => unit = "deepEqual";
[@bs.send] external _notDeepEqual : (cbExecutionContextJS, 'a, 'a) => unit = "notDeepEqual";
[@bs.send] external _regex : (cbExecutionContextJS, string, Js.Re.t) => unit = "regex";
[@bs.send] external _notRegex : (cbExecutionContextJS, string, Js.Re.t) => unit = "notRegex";
[@bs.send] external _throws : (cbExecutionContextJS, unit => unit) => unit = "throws";
[@bs.send] external _notThrows : (cbExecutionContextJS, unit => unit) => unit = "notThrows";
[@bs.send]
external _cbEnd : (cbExecutionContextJS, Js.Nullable.t(Js.Exn.t)) => unit =
"end";

let makeCbExecutionContext =
  (cbExecutionContextJS: cbExecutionContextJS)
  : cbExecutionContext => {
pass: () => _cb_pass(cbExecutionContextJS),
fail: () => _cb_fail(cbExecutionContextJS),
truthy: actual => _truthy(cbExecutionContextJS, actual),
falsy: actual => _falsy(cbExecutionContextJS, actual),
is: (expected, actual) => _is(cbExecutionContextJS, actual, expected),
not: (expected, actual) => _not(cbExecutionContextJS, actual, expected),
deepEqual: (expected, actual) => _deepEqual(cbExecutionContextJS, actual, expected),
notDeepEqual: (expected, actual) => _notDeepEqual(cbExecutionContextJS, actual, expected),
regex: (regex, content) => _regex(cbExecutionContextJS, content, regex),
notRegex: (regex, content) => _notRegex(cbExecutionContextJS, content, regex),
throws: (task) => _throws(cbExecutionContextJS, task),
notThrows: (task) => _notThrows(cbExecutionContextJS, task),
cb: (~error: option(Js.Exn.t)=?, _) =>
  _cbEnd(cbExecutionContextJS, Js.Nullable.fromOption(error)),
};
let makeImplementationResultJS: implementationResultJS => implementationResult =
  result => result;
let makeCbImplementation = (cbImplementation, t) =>
t |> makeCbExecutionContext |> cbImplementation |> makeImplementationResultJS;

[@bs.module "../../.."]
external _test : (string, cbExecutionContextJS => unit) => unit = "cb";
let test: cbInterface =
(message, implementation) =>
  _test(message, implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope "cb"]
external _test_failing : (string, cbExecutionContextJS => unit) => unit =
"failing";
let test_failing: cbFailingInterface =
(message, implementation) =>
  _test_failing(message, implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope "cb"]
external _test_only : (string, cbExecutionContextJS => unit) => unit =
"only";
let test_only: cbOnlyInterface =
(message, implementation) =>
  _test_only(message, implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("cb", "failing")]
external _test_failing_only : (string, cbExecutionContextJS => unit) => unit =
"only";
let test_failing_only: cbOnlyInterface =
(message, implementation) =>
  _test_failing_only(message, implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope "cb"]
external _test_skip : (string, cbExecutionContextJS => unit) => unit =
"skip";
let test_skip: cbSkipInterface =
(message, implementation) =>
  _test_skip(message, implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("cb", "failing")]
external _test_failing_skip : (string, cbExecutionContextJS => unit) => unit =
"skip";
let test_failing_skip: cbSkipInterface =
(message, implementation) =>
  _test_failing_skip(message, implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope "after"]
external _after : (cbExecutionContextJS => unit) => unit = "cb";
let after: hookCbInterface =
implementation => _after(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("after", "always")]
external _after_always : (cbExecutionContextJS => unit) => unit = "cb";
let after_always: hookCbInterface =
implementation => _after_always(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope "afterEach"]
external _after_each : (cbExecutionContextJS => unit) => unit = "cb";
let after_each: hookCbInterface =
implementation => _after(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("afterEach", "always")]
external _after_each_always : (cbExecutionContextJS => unit) => unit = "cb";
let after_each_always: hookCbInterface =
implementation =>
  _after_each_always(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope "before"]
external _before : (cbExecutionContextJS => unit) => unit = "cb";
let before: hookCbInterface =
implementation => _before(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("before", "always")]
external _before_always : (cbExecutionContextJS => unit) => unit = "cb";
let before_always: hookCbInterface =
implementation => _before_always(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope "beforeEach"]
external _before_each : (cbExecutionContextJS => unit) => unit = "cb";
let before_each: hookCbInterface =
implementation => _before_each(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("beforeEach", "always")]
external _before_each_always : (cbExecutionContextJS => unit) => unit = "cb";
let before_each_always: hookCbInterface =
implementation =>
  _before_each_always(implementation |> makeCbImplementation);

[@bs.module "../../.."]
external _todo : string => unit = "todo";
let todo: todoDeclaration = message => _todo(message);

module Serial = {
[@bs.module "../../.."] [@bs.scope "serial"]
external _test : (string, cbExecutionContextJS => unit) => unit = "cb";
let test: cbInterface =
  (message, implementation) =>
    _test(message, implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("serial", "cb")]
external _test_failing : (string, cbExecutionContextJS => unit) => unit =
  "failing";
let test_failing: cbFailingInterface =
  (message, implementation) =>
    _test_failing(message, implementation |> makeCbImplementation);

/* [@bs.module "../../.."] [@bs.scope ("serial", "only")]
    external _test_only : (string, cbExecutionContextJS => unit) => unit =
      "cb";
    let test_only: cbOnlyInterface =
      (message, implementation) =>
        _test_only(message, implementation |> makeCbImplementation); */

/* [@bs.module "../../.."] [@bs.scope ("serial", "failing", "only")]
    external _test_failing_only :
      (string, cbExecutionContextJS => unit) => unit =
      "cb";
    let test_failing_only: cbOnlyInterface =
      (message, implementation) =>
        _test_failing_only(message, implementation |> makeCbImplementation); */

/* [@bs.module "../../.."] [@bs.scope ("serial", "skip")]
    external _test_skip : (string, cbExecutionContextJS => unit) => unit =
      "cb";
    let test_skip: cbSkipInterface =
      (message, implementation) =>
        _test_skip(message, implementation |> makeCbImplementation); */

/* [@bs.module "../../.."] [@bs.scope ("serial", "failing", "skip")]
    external _test_failing_skip :
      (string, cbExecutionContextJS => unit) => unit =
      "cb";
    let test_failing_skip: cbSkipInterface =
      (message, implementation) =>
        _test_failing_skip(message, implementation |> makeCbImplementation); */

[@bs.module "../../.."] [@bs.scope ("serial", "after")]
external _after : (cbExecutionContextJS => unit) => unit = "cb";
let after: hookCbInterface =
  implementation => _after(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("serial", "after", "always")]
external _after_always : (cbExecutionContextJS => unit) => unit = "cb";
let after_always: hookCbInterface =
  implementation => _after_always(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("serial", "afterEach")]
external _after_each : (cbExecutionContextJS => unit) => unit = "cb";
let after_each: hookCbInterface =
  implementation => _after(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("serial", "afterEach", "always")]
external _after_each_always : (cbExecutionContextJS => unit) => unit =
  "cb";
let after_each_always: hookCbInterface =
  implementation =>
    _after_each_always(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("serial", "before")]
external _before : (cbExecutionContextJS => unit) => unit = "cb";
let before: hookCbInterface =
  implementation => _before(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("serial", "before", "always")]
external _before_always : (cbExecutionContextJS => unit) => unit = "cb";
let before_always: hookCbInterface =
  implementation =>
    _before_always(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope ("serial", "beforeEach")]
external _before_each : (cbExecutionContextJS => unit) => unit = "cb";
let before_each: hookCbInterface =
  implementation => _before_each(implementation |> makeCbImplementation);

[@bs.module "../../.."] [@bs.scope "serial"]
external _todo : string => unit = "todo";
let todo: todoDeclaration = message => _todo(message);
};
