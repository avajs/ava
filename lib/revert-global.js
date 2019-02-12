// Track global and require.cache keys and
// removes any new keys when revert is called
function revertGlobal() {
	const storedKeys = {};
	const storedCache = Object.assign({}, require.cache);
	const storedExtensions = Object.assign({}, module.constructor._extensions);
	const preventCache = ['bluebird', '../index.js', './worker/main.js'];
	preventCache.forEach(mod => delete storedCache[require.resolve(mod)]);

	for (const key of Object.getOwnPropertyNames(global)) {
		storedKeys[key] = true;
	}

	return () => {
		for (const key of Object.getOwnPropertyNames(global)) {
			if (storedKeys[key]) {
				continue;
			}

			global[key] = undefined;
		}

		// Revert require.cache to storedCache
		module.constructor._cache = Object.assign({}, storedCache);
		module.constructor._extensions = Object.assign({}, storedExtensions);
		require.cache = module.constructor._cache;
		/* eslint-disable-next-line node/no-deprecated-api */
		require.extensions = module.constructor._extensions;
	};
}

module.exports = revertGlobal;
