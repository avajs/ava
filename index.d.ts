export interface ObservableLike {
	subscribe(observer: (value: any) => void): void;
}

export type Constructor = (new (...args: Array<any>) => any);

export type ThrowsExpectation = {
	instanceOf?: Constructor;
	is?: Error;
	message?: string | RegExp;
	name?: string;
};

export type ThrowsErrorValidator = Constructor | RegExp | string | ThrowsExpectation;

export interface SnapshotOptions {
	id?: string;
}

export interface Assertions {
	/** Assert that `actual` is deep equal to `expected` */
	deepEqual<ValueType = any>(actual: ValueType, expected: ValueType, message?: string): void;

	/** Cause the test to fail */
	fail(message?: string): void;

	/** Assert that `actual` is equal to false */
	false(actual: any, message?: string): void;

	/** Assert that `actual` is falsy (false, 0, '', null, undefined, NaN) */
	falsy(actual: any, message?: string): void;

	/** Assert that `error` is falsy */
	ifError(error: any, message?: string): void;

	/** Assert that `actual` is strictly equal to `expected` */
	is<ValueType = any>(actual: ValueType, expected: ValueType, message?: string): void;

	/** Assert that `actual` is not strictly equal to `expected` */
	not<ValueType = any>(actual: ValueType, expected: ValueType, message?: string): void;

	/** Assert that `actual` is not deep equal to `expected` */
	notDeepEqual<ValueType = any>(actual: ValueType, expected: ValueType, message?: string): void;

	/** Assert that `string` does not match the regex pattern */
	notRegex(string: string, regex: RegExp, message?: string): void;

	/** Assert that a function does not throw */
	notThrows(value: () => never, message?: string): void;

	/** Assert that a function that returns an observable does not throw */
	notThrows(value: () => ObservableLike, message?: string): Promise<void>;

	/** Assert that a function that returns a promise throws an error */
	notThrows(value: () => PromiseLike<any>, message?: string): Promise<void>;

	/** Assert that a function does not throw */
	notThrows(value: () => any, message?: string): void;

	/** Assert that an observable does not throw */
	notThrows(value: ObservableLike, message?: string): Promise<void>;

	/** Assert that a promise does not throw */
	notThrows(value: PromiseLike<any>, message?: string): Promise<void>;

	/** Passing assertion */
	pass(message?: string): void;

	/** Assert that string match the regex pattern */
	regex(string: string, regex: RegExp, message?: string): void;

	/** Assert that expected matches a snapshot */
	snapshot(expected: any, message?: string): void;

	/** Assert that expected matches a snapshot with option `id` */
	snapshot(expected: any, options: SnapshotOptions, message?: string): void;

	/** Assert that a function that returns any value throws an error */
	throws(value: () => never, error?: ThrowsErrorValidator, message?: string): any;

	/** Assert that a function that returns an observable throws an error */
	throws(value: () => ObservableLike, error?: ThrowsErrorValidator, message?: string): Promise<any>;

	/** Assert that a function that returns a promise throws an error */
	throws(value: () => PromiseLike<any>, error?: ThrowsErrorValidator, message?: string): Promise<any>;

	/** Assert that a function that returns any value throws an error */
	throws(value: () => any, error?: ThrowsErrorValidator, message?: string): any;

	/** Assert that an observable throws an error */
	throws(value: ObservableLike, error?: ThrowsErrorValidator, message?: string): Promise<any>;

	/** Assert that a promise throws an error */
	throws(value: PromiseLike<any>, error?: ThrowsErrorValidator, message?: string): Promise<any>;

	/** Assert that actual is equal to true */
	true(actual: any, message?: string): void;

	/** Assert that actual is truthy ('0', 'false', [], {}, function() {}, etc.) */
	truthy(actual: any, message?: string): void;
}

export interface ExecutionContext<Context = {}> extends Assertions {
	context: Context;
	skip: Assertions;
	title: string;
	log(...values: Array<any>): void;
	plan(count: number): void;
}

export interface CbExecutionContext<Context = {}> extends ExecutionContext<Context> {
	end(): void;
}

export type ImplementationResult = PromiseLike<void> | ObservableLike | Iterator<any> | void;
export type Implementation<Context = {}> = (t: ExecutionContext<Context>) => ImplementationResult;
export type CbImplementation<Context = {}> = (t: CbExecutionContext<Context>) => ImplementationResult;

export interface Macro<Context = {}> {
	(t: ExecutionContext<Context>, ...args: Array<any>): ImplementationResult;
	title?: (providedTitle: string, ...args: Array<any>) => string;
}

export interface CbMacro<Context = {}> {
	(t: CbExecutionContext<Context>, ...args: Array<any>): ImplementationResult;
	title?: (providedTitle: string, ...args: Array<any>) => string;
}

export interface TestInterface<Context = {}> {
	(title: string, implementation: Implementation<Context>): void;
	(title: string, macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;
	(macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;

	/** Specify a hook that run once all test have completed */
	after: AfterInterface<Context>;

	/** Specify a hook that run after each test */
	afterEach: AfterInterface<Context>;

	/** Specify a hook that run before all test runs */
	before: BeforeInterface<Context>;

	/** Specify a hook that run before each test */
	beforeEach: BeforeInterface<Context>;

	/** Specify a hook/test that support callbacks */
	cb: CbInterface<Context>;

	/** Specify a test that fails */
	failing: FailingInterface<Context>;

	/** Specify a test that run only this test */
	only: OnlyInterface<Context>;

	/** Specify a test/hook that run serially */
	serial: SerialInterface<Context>;

	/** Specify a test/hook that will be skipped */
	skip: SkipInterface<Context>;

	/** TODO tests/hooks */
	todo: TodoDeclaration;
}

export interface AfterInterface<Context = {}> {
	(title: string, implementation: Implementation<Context>): void;
	(title: string, macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;
	(macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;

	always: AlwaysInterface<Context>;
	cb: HookCbInterface<Context>;
	skip: SkipInterface<Context>;
}

export interface AlwaysInterface<Context = {}> {
	(title: string, implementation: Implementation<Context>): void;
	(title: string, macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;
	(macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;

	cb: HookCbInterface<Context>;
	skip: SkipInterface<Context>;
}

export interface BeforeInterface<Context = {}> {
	(title: string, implementation: Implementation<Context>): void;
	(title: string, macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;
	(macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;

	cb: HookCbInterface<Context>;
	skip: SkipInterface<Context>;
}

export interface CbInterface<Context = {}> {
	(title: string, implementation: CbImplementation<Context>): void;
	(title: string, macro: CbMacro<Context> | CbMacro<Context>[], ...args: Array<any>): void;
	(macro: CbMacro<Context> | CbMacro<Context>[], ...args: Array<any>): void;

	failing: CbFailingInterface<Context>;
	only: CbOnlyInterface<Context>;
	skip: CbSkipInterface<Context>;
}

export interface CbFailingInterface<Context = {}> {
	(title: string, implementation: CbImplementation<Context>): void;
	(title: string, macro: CbMacro<Context> | CbMacro<Context>[], ...args: Array<any>): void;
	(macro: CbMacro<Context> | CbMacro<Context>[], ...args: Array<any>): void;

	only: CbOnlyInterface<Context>;
	skip: CbSkipInterface<Context>;
}

export interface CbOnlyInterface<Context = {}> {
	(title: string, implementation: CbImplementation<Context>): void;
	(title: string, macro: CbMacro<Context> | CbMacro<Context>[], ...args: Array<any>): void;
	(macro: CbMacro<Context> | CbMacro<Context>[], ...args: Array<any>): void;
}

export interface CbSkipInterface<Context = {}> {
	(title: string, implementation: CbImplementation<Context>): void;
	(title: string, macro: CbMacro<Context> | CbMacro<Context>[], ...args: Array<any>): void;
	(macro: CbMacro<Context> | CbMacro<Context>[], ...args: Array<any>): void;
}

export interface FailingInterface<Context = {}> {
	(title: string, implementation: Implementation<Context>): void;
	(title: string, macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;
	(macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;

	only: OnlyInterface<Context>;
	skip: SkipInterface<Context>;
}

export interface HookCbInterface<Context = {}> {
	(title: string, implementation: CbImplementation<Context>): void;
	(title: string, macro: CbMacro<Context> | CbMacro<Context>[], ...args: Array<any>): void;
	(macro: CbMacro<Context> | CbMacro<Context>[], ...args: Array<any>): void;

	skip: CbSkipInterface<Context>;
}

export interface OnlyInterface<Context = {}> {
	(title: string, implementation: Implementation<Context>): void;
	(title: string, macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;
	(macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;
}

export interface SerialInterface<Context = {}> {
	(title: string, implementation: Implementation<Context>): void;
	(title: string, macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;
	(macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;

	after: AfterInterface<Context>;
	afterEach: AfterInterface<Context>;
	before: BeforeInterface<Context>;
	beforeEach: BeforeInterface<Context>;
	cb: CbInterface<Context>;
	failing: FailingInterface<Context>;
	only: OnlyInterface<Context>;
	skip: SkipInterface<Context>;
	todo: TodoDeclaration;
}

export interface SkipInterface<Context = {}> {
	(title: string, implementation: Implementation<Context>): void;
	(title: string, macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;
	(macro: Macro<Context> | Macro<Context>[], ...args: Array<any>): void;
}

export type TodoDeclaration = (title: string) => void;

declare const test: TestInterface;
export default test;

export {test};
export const after: AfterInterface;
export const afterEach: AfterInterface;
export const before: BeforeInterface;
export const beforeEach: BeforeInterface;
export const cb: CbInterface;
export const failing: FailingInterface;
export const only: OnlyInterface;
export const serial: SerialInterface;
export const skip: SkipInterface;
export const todo: TodoDeclaration;
