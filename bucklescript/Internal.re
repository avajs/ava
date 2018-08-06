type passAssertion = unit => unit;
type failAssertion = unit => unit;
type truthyAssertion = bool => unit;
type falsyAssertion = bool => unit;
type isAssertion('a) = ('a, 'a) => unit;
type notAssertion('a) = ('a, 'a) => unit;
type deepEqualAssertion('a) = ('a, 'a) => unit;
type notDeepEqualAssertion('a) = ('a, 'a) => unit;
type throwsSyncAssertion = (unit => unit) => unit;
type notThrowsSyncAssertion = (unit => unit) => unit;
type throwsPromiseAssertion = (unit => unit) => Js.Promise.t(unit);
type notThrowsPromiseAssertion = (unit => unit) => Js.Promise.t(unit);
type throwsAsyncPromiseAssertion('a) = (unit => Js.Promise.t('a)) => Js.Promise.t(unit);
type notThrowsAsyncPromiseAssertion('a) = (unit => Js.Promise.t('a)) => Js.Promise.t(unit);
type regexAssertion = (Js.Re.t, string) => unit;
type notRegexAssertion = (Js.Re.t, string) => unit;

type assertions = {
  pass: passAssertion,
  fail: failAssertion,
  truthy: truthyAssertion,
  falsy: falsyAssertion,
  is: 'a.isAssertion('a),
  not: 'a.notAssertion('a),
  deepEqual: 'a.deepEqualAssertion('a),
  notDeepEqual: 'a.notDeepEqualAssertion('a),
  throws: throwsSyncAssertion,
  notThrows: notThrowsSyncAssertion,
  regex: regexAssertion,
  notRegex: notRegexAssertion,
};
type executionContext = assertions;
type executionContextJS;
type implementationResultJS = unit;
type implementationJS = executionContextJS => implementationResultJS;
type implementationResult = unit;
type implementation = executionContext => implementationResult;

type cbAssertions = {
  pass: passAssertion,
  fail: failAssertion,
  truthy: truthyAssertion,
  falsy: falsyAssertion,
  is: 'a.isAssertion('a),
  not: 'a.notAssertion('a),
  deepEqual: 'a.deepEqualAssertion('a),
  notDeepEqual: 'a.notDeepEqualAssertion('a),
  throws: throwsSyncAssertion,
  notThrows: notThrowsSyncAssertion,
  regex: regexAssertion,
  notRegex: notRegexAssertion,
  cb: (~error: Js.Exn.t=?, unit) => unit,
};
type cbExecutionContext = cbAssertions;
type cbExecutionContextJS;
type cbImplementationJS = cbExecutionContextJS => implementationResultJS;
type cbImplementation = cbExecutionContext => implementationResult;

type promiseAssertions = {
  pass: passAssertion,
  fail: failAssertion,
  truthy: truthyAssertion,
  falsy: falsyAssertion,
  is: 'a.isAssertion('a),
  not: 'a.notAssertion('a),
  deepEqual: 'a.deepEqualAssertion('a),
  notDeepEqual: 'a.notDeepEqualAssertion('a),
  throws: throwsPromiseAssertion,
  notThrows: notThrowsPromiseAssertion,
  throwsAsync: 'a.throwsAsyncPromiseAssertion('a),
  notThrowsAsync: 'a.notThrowsAsyncPromiseAssertion('a),
  regex: regexAssertion,
  notRegex: notRegexAssertion,
};
type promiseExecutionContext = promiseAssertions;
type promiseExecutionContextJS;
type promiseImplementationResult('a) = Js.Promise.t('a);
type promiseImplementationResultJS('a) = Js.Promise.t('a);

type promiseImplementation('a) =
  promiseExecutionContext => promiseImplementationResult('a);


type testInterface = (string, implementation) => unit;
type todoDeclaration = string => unit;
type onlyInterface = (string, implementation) => unit;
type skipInterface = (string, implementation) => unit;
type failingInterface = (string, implementation) => unit;
type serialInterface = (string, implementation) => unit;
type afterInterface = implementation => unit;
type beforeInterface = implementation => unit;
type cbInterface = (string, cbImplementation) => unit;
type alwaysInterface = cbImplementation => unit;
type hookCbInterface = cbImplementation => unit;
type hookCbSkipInterface = cbImplementation => unit;
type hookSkipInterface = implementation => unit;
type cbFailingInterface = (string, cbImplementation) => unit;
type cbOnlyInterface = (string, cbImplementation) => unit;
type cbSkipInterface = (string, cbImplementation) => unit;
type promiseInterface('a) = (string, promiseImplementation('a)) => unit;
type alwaysPromiseInterface('a) = promiseImplementation('a) => unit;
type hookPromiseInterface('a) = promiseImplementation('a) => unit;
type hookPromiseSkipPromiseInterface('a) = promiseImplementation('a) => unit;
type hookSkipPromiseInterface('a) = promiseImplementation('a) => unit;
type failingPromiseInterface('a) =
  (string, promiseImplementation('a)) => unit;
type onlyPromiseInterface('a) = (string, promiseImplementation('a)) => unit;
type skipPromiseInterface('a) = (string, promiseImplementation('a)) => unit;
