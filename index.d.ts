import type {TestFn} from './types/test-fn';

export * from './types/assertions';
export * from './types/try-fn';
export * from './types/test-fn';
export * from './types/subscribable';

/** Call to declare a test, or chain to declare hooks or test modifiers */
declare const test: TestFn;

/** Call to declare a test, or chain to declare hooks or test modifiers */
export default test;
