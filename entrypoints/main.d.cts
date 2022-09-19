import type {TestFn} from '../types/test-fn.cjs';

export * from '../types/assertions.cjs';
export * from '../types/try-fn.cjs';
export * from '../types/test-fn.cjs';
export * from '../types/subscribable.cjs';

/** Call to declare a test, or chain to declare hooks or test modifiers */
declare const test: TestFn;

/** Call to declare a test, or chain to declare hooks or test modifiers */
export default test;
