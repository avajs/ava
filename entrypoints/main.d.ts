import type {TestFn} from '../types/test-fn.js';

export type * from '../types/assertions.js';
export type * from '../types/try-fn.js';
export type * from '../types/test-fn.js';
export type * from '../types/subscribable.js';

/** Call to declare a test, or chain to declare hooks or test modifiers */
declare const test: TestFn;

/** Call to declare a test, or chain to declare hooks or test modifiers */
export default test;

/**
 * Register a function to be called when AVA has completed a test run without uncaught exceptions or unhandled rejections.
 *
 * Completion handlers are invoked in order of registration. Results are not awaited.
 */
declare const registerCompletionHandler: (handler: () => void) => void;
export {registerCompletionHandler};
