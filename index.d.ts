/**
 * @file
 * This file exists purely so that self references to ava within this package
 * are able to resolve the correct type information. Any changes to type
 * information should be made in `./types/main.d.ts`.
 */

export * from './types/main.js';
export {default} from './types/main.js';
