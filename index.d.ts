// Shim for ./entrypoints/main, which is only resolved under the Node16 module
// resolution algorithm.
/* eslint-disable n/file-extension-in-import */

export * from './entrypoints/main';
export {default} from './entrypoints/main';
