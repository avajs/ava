module.exports = (configuredExtensions, defaultModuleType) => {
	const lockedModuleTypes = {
		cjs: 'commonjs',
		mjs: 'module',
		js: defaultModuleType
	};

	const createModuleTypesFromExtensionsObject = extensionsObject => {
		const configuredModuleTypes = {};

		for (const [extension, type] of Object.entries(extensionsObject)) {
			if (extension in lockedModuleTypes && type !== lockedModuleTypes[extension]) {
				throw new TypeError(`.${extension} files can only be configured as ’${lockedModuleTypes[extension]}’${
					extension === 'js' ?
						` when the nearest parent package.json ${type === 'module' ? 'does not contain' : 'contains'} "type": "module"` : ''
				}, found ’${type}’ instead.`);
			}

			configuredModuleTypes[extension] = type;
		}

		return configuredModuleTypes;
	};

	const createModuleTypesFromExtensionsArray = extensions => {
		const generatedModuleTypes = {};

		for (const extension of extensions) {
			if (extension in lockedModuleTypes) {
				generatedModuleTypes[extension] = lockedModuleTypes[extension];
			} else {
				generatedModuleTypes[extension] = 'commonjs';
			}
		}

		return generatedModuleTypes;
	};

	let moduleTypes;
	if (configuredExtensions === undefined) {
		moduleTypes = {
			...lockedModuleTypes
		};
	} else if (Array.isArray(configuredExtensions)) {
		moduleTypes = createModuleTypesFromExtensionsArray(configuredExtensions);
	} else {
		moduleTypes = createModuleTypesFromExtensionsObject(configuredExtensions);
	}

	return moduleTypes;
};
