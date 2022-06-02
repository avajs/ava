/**
 * @file
 * This file exists purely so that self references to ava/plugin within this package
 * are able to resolve the correct type information. Any changes to type
 * information should be made in `./types/plugin.d.ts`.
 */

export * from './types/plugin';
export {default} from './types/plugin';
