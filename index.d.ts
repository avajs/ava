export interface ObservableLike {
	subscribe(observer: (value: any) => void): void;
}

export type ThrowsErrorValidator = (new (...args: Array<any>) => any) | RegExp | string;

export interface SnapshotOptions {
	id?: string;
}

export interface Assertions {
	deepEqual<ValueType = any>(actual: ValueType, expected: ValueType, message?: string): void;
	fail(message?: string): void;
	false(actual: any, message?: string): void;
	falsy(actual: any, message?: string): void;
	ifError(error: any, message?: string): void;
	is<ValueType = any>(actual: ValueType, expected: ValueType, message?: string): void;
	not<ValueType = any>(actual: ValueType, expected: ValueType, message?: string): void;
	notDeepEqual<ValueType = any>(actual: ValueType, expected: ValueType, message?: string): void;
	notRegex(string: string, regex: RegExp, message?: string): void;
	notThrows(value: () => never, message?: string): void;
	notThrows(value: () => ObservableLike, message?: string): Promise<void>;
	notThrows(value: () => PromiseLike<any>, message?: string): Promise<void>;
	notThrows(value: () => any, message?: string): void;
	notThrows(value: ObservableLike, message?: string): Promise<void>;
	notThrows(value: PromiseLike<any>, message?: string): Promise<void>;
	pass(message?: string): void;
	regex(string: string, regex: RegExp, message?: string): void;
	snapshot(expected: any, message?: string): void;
	snapshot(expected: any, options: SnapshotOptions, message?: string): void;
	throws(value: () => never, error?: ThrowsErrorValidator, message?: string): any;
	throws(value: () => ObservableLike, error?: ThrowsErrorValidator, message?: string): Promise<any>;
	throws(value: () => PromiseLike<any>, error?: ThrowsErrorValidator, message?: string): Promise<any>;
	throws(value: () => any, error?: ThrowsErrorValidator, message?: string): any;
	throws(value: ObservableLike, error?: ThrowsErrorValidator, message?: string): Promise<any>;
	throws(value: PromiseLike<any>, error?: ThrowsErrorValidator, message?: string): Promise<any>;
	true(actual: any, message?: string): void;
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

	after: AfterInterface<Context>;
	afterEach: AfterInterface<Context>;
	before: BeforeInterface<Context>;
	beforeEach: BeforeInterface<Context>;
	cb: CbInterface<Context>;
	failing: FailingInterface<Context>;
	only: OnlyInterface<Context>;
	serial: SerialInterface<Context>;
	skip: SkipInterface<Context>;
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
