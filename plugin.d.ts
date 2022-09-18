// Shim for ./entrypoints/plugin, which is only resolved under the Node16 module
// resolution algorithm.
/* eslint-disable n/file-extension-in-import */

export * from './entrypoints/plugin';
export {default} from './entrypoints/plugin';
