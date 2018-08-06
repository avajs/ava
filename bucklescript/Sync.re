open Internal;

[@bs.send] external _pass : executionContextJS => unit = "pass";
[@bs.send] external _fail : executionContextJS => unit = "fail";
[@bs.send] external _truthy : (executionContextJS, bool) => unit = "truthy";
[@bs.send] external _falsy : (executionContextJS, bool) => unit = "falsy";
[@bs.send] external _is : (executionContextJS, 'a, 'a) => unit = "is";
[@bs.send] external _not : (executionContextJS, 'a, 'a) => unit = "not";
[@bs.send] external _deepEqual : (executionContextJS, 'a, 'a) => unit = "deepEqual";
[@bs.send] external _notDeepEqual : (executionContextJS, 'a, 'a) => unit = "notDeepEqual";
[@bs.send] external _throws : (executionContextJS, unit => unit) => unit = "throws";
[@bs.send] external _notThrows : (executionContextJS, unit => unit) => unit = "notThrows";
[@bs.send] external _regex : (executionContextJS, string, Js.Re.t) => unit = "regex";
[@bs.send] external _notRegex : (executionContextJS, string, Js.Re.t) => unit = "notRegex";
[@bs.send] external _end : executionContextJS => unit = "end";

let makeExecutionContext =
    (executionContextJS: executionContextJS)
    : executionContext => {
  pass: () => _pass(executionContextJS),
  fail: () => _fail(executionContextJS),
  truthy: actual => _truthy(executionContextJS, actual),
  falsy: actual => _falsy(executionContextJS, actual),
  is: (expected, actual) => _is(executionContextJS, actual, expected),
  not: (expected, actual) => _not(executionContextJS, actual, expected),
  deepEqual: (expected, actual) => _deepEqual(executionContextJS, actual, expected),
  notDeepEqual: (expected, actual) => _notDeepEqual(executionContextJS, actual, expected),
  throws: (task) => _throws(executionContextJS, task),
  notThrows: (task) => _notThrows(executionContextJS, task),
  regex: (regex, content) => _regex(executionContextJS, content, regex),
  notRegex: (regex, content) => _notRegex(executionContextJS, content, regex),
};
let makeImplementationResultJS: implementationResultJS => implementationResult =
    result => result;
let makeImplementation = (implementation, t) =>
  t |> makeExecutionContext |> implementation |> makeImplementationResultJS;


[@bs.module]
external _test : (string, executionContextJS => unit) => unit = "../../..";
let test: testInterface =
  (message, implementation) =>
    _test(message, implementation |> makeImplementation);

[@bs.module "../../.."]
external _test_failing : (string, executionContextJS => unit) => unit =
  "failing";
let test_failing: failingInterface =
  (message, implementation) =>
    _test_failing(message, implementation |> makeImplementation);

[@bs.module "../../.."]
external _test_only : (string, executionContextJS => unit) => unit = "only";
let test_only: onlyInterface =
  (message, implementation) =>
    _test_only(message, implementation |> makeImplementation);

[@bs.module "../../.."] [@bs.scope "failing"]
external _test_failing_only : (string, executionContextJS => unit) => unit =
  "only";
let test_failing_only: onlyInterface =
  (message, implementation) =>
    _test_failing_only(message, implementation |> makeImplementation);

[@bs.module "../../.."]
external _test_skip : (string, executionContextJS => unit) => unit = "skip";
let test_skip: skipInterface =
  (message, implementation) =>
    _test_skip(message, implementation |> makeImplementation);

[@bs.module "../../.."] [@bs.scope "failing"]
external _test_failing_skip : (string, executionContextJS => unit) => unit =
  "skip";
let test_failing_skip: skipInterface =
  (message, implementation) =>
    _test_failing_skip(message, implementation |> makeImplementation);

[@bs.module "../../.."]
external _after : (executionContextJS => unit) => unit = "after";
let after: afterInterface =
  implementation => _after(implementation |> makeImplementation);

[@bs.module "../../.."] [@bs.scope  "after"]
external _after_always : (executionContextJS => unit) => unit = "always";
let after_always: afterInterface =
  implementation => _after_always(implementation |> makeImplementation);

[@bs.module "../../.."]
external _after_each : (executionContextJS => unit) => unit = "afterEach";
let after_each: afterInterface =
  implementation => _after(implementation |> makeImplementation);

[@bs.module "../../.."] [@bs.scope "afterEach"]
external _after_each_always : (executionContextJS => unit) => unit =
  "always";
let after_each_always: afterInterface =
  implementation =>
    _after_each_always(implementation |> makeImplementation);

[@bs.module "../../.."]
external _before : (executionContextJS => unit) => unit = "before";
let before: beforeInterface =
  implementation => _before(implementation |> makeImplementation);

[@bs.module "../../.."] [@bs.scope "before"]
external _before_always : (executionContextJS => unit) => unit = "always";
let before_always: beforeInterface =
  implementation => _before_always(implementation |> makeImplementation);

[@bs.module "../../.."]
external _before_each : (executionContextJS => unit) => unit = "beforeEach";
let before_each: beforeInterface =
  implementation => _before_each(implementation |> makeImplementation);

[@bs.module "../../.."] [@bs.scope "beforeEach"]
external _before_each_always : (executionContextJS => unit) => unit =
  "always";
let before_each_always: beforeInterface =
  implementation =>
    _before_each_always(implementation |> makeImplementation);

[@bs.module "../../.."]
external _todo : string => unit = "todo";
let todo: todoDeclaration = message => _todo(message);

module Serial = {
  [@bs.module "../../.."]
  external _test : (string, executionContextJS => unit) => unit = "serial";
  let test: testInterface =
    (message, implementation) =>
      _test(message, implementation |> makeImplementation);

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _test_failing : (string, executionContextJS => unit) => unit =
    "failing";
  let test_failing: failingInterface =
    (message, implementation) =>
      _test_failing(message, implementation |> makeImplementation);

  [@bs.module "../../.."] [@bs.scope  "serial"]
  external _test_only : (string, executionContextJS => unit) => unit =
    "only";
  let test_only: onlyInterface =
    (message, implementation) =>
      _test_only(message, implementation |> makeImplementation);

  /* [@bs.module "../../.."] [@bs.scope ("serial", "failing")]
      external _test_failing_only : (string, executionContextJS => unit) => unit =
        "only";
      let test_failing_only: onlyInterface =
        (message, implementation) =>
          _test_failing_only(message, implementation |> makeImplementation); */

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _test_skip : (string, executionContextJS => unit) => unit =
    "skip";
  let test_skip: skipInterface =
    (message, implementation) =>
      _test_skip(message, implementation |> makeImplementation);

  /* [@bs.module "../../.."] [@bs.scope ("serial", "failing")]
      external _test_failing_skip : (string, executionContextJS => unit) => unit =
        "skip";
      let test_failing_skip: skipInterface =
        (message, implementation) =>
          _test_failing_skip(message, implementation |> makeImplementation); */

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _after : (executionContextJS => unit) => unit = "after";
  let after: afterInterface =
    implementation => _after(implementation |> makeImplementation);

  [@bs.module "../../.."] [@bs.scope ("serial", "after")]
  external _after_always : (executionContextJS => unit) => unit = "always";
  let after_always: afterInterface =
    implementation => _after_always(implementation |> makeImplementation);

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _after_each : (executionContextJS => unit) => unit = "afterEach";
  let after_each: afterInterface =
    implementation => _after(implementation |> makeImplementation);

  [@bs.module "../../.."] [@bs.scope ("serial", "afterEach")]
  external _after_each_always : (executionContextJS => unit) => unit =
    "always";
  let after_each_always: afterInterface =
    implementation =>
      _after_each_always(implementation |> makeImplementation);

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _before : (executionContextJS => unit) => unit = "before";
  let before: beforeInterface =
    implementation => _before(implementation |> makeImplementation);

  [@bs.module "../../.."] [@bs.scope ("serial", "before")]
  external _before_always : (executionContextJS => unit) => unit = "always";
  let before_always: beforeInterface =
    implementation => _before_always(implementation |> makeImplementation);

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _before_each : (executionContextJS => unit) => unit =
    "beforeEach";
  let before_each: beforeInterface =
    implementation => _before_each(implementation |> makeImplementation);

  [@bs.module "../../.."] [@bs.scope "serial"]
  external _todo : string => unit = "todo";
  let todo: todoDeclaration = message => _todo(message);
};
