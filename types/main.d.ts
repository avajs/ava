import type {TestFn} from './test-fn';

export * from './assertions';
export * from './try-fn';
export * from './test-fn';
export * from './subscribable';

/** Call to declare a test, or chain to declare hooks or test modifiers */
declare const test: TestFn;

/** Call to declare a test, or chain to declare hooks or test modifiers */
export default test;
