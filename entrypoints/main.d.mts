import type {TestFn} from '../types/test-fn.cjs';

export * from '../types/assertions.cjs';
export * from '../types/try-fn.cjs';
export * from '../types/test-fn.cjs';
export * from '../types/subscribable.cjs';

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
