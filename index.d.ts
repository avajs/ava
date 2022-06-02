import type {TestFn} from './types/test-fn.js';

export * from './types/assertions.js';
export * from './types/try-fn.js';
export * from './types/test-fn.js';
export * from './types/subscribable.js';

/** Call to declare a test, or chain to declare hooks or test modifiers */
declare const test: TestFn;

/** Call to declare a test, or chain to declare hooks or test modifiers */
export default test;
