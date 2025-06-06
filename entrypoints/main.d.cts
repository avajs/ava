import type {TestFn} from '../types/test-fn.cjs';

export type * from '../types/assertions.cjs';
export type * from '../types/try-fn.cjs';
export type * from '../types/test-fn.cjs';
export type * from '../types/subscribable.cjs';

/** Call to declare a test, or chain to declare hooks or test modifiers */
declare const test: TestFn;

/** Call to declare a test, or chain to declare hooks or test modifiers */
export default test;
