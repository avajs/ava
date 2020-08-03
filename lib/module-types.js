module.exports = (configuredExtensions, defaultModuleType) => {
	const lockedModuleTypes = {
		cjs: 'commonjs',
		mjs: 'module',
		js: defaultModuleType
	};
	const acceptedModuleTypes = new Set(['commonjs', 'module']);

	const validateAndGetModuleType = (extension, type) => {
		if (Reflect.has(lockedModuleTypes, extension)) {
			if (type !== true) {
				const lockedExtensions = Object.keys(lockedModuleTypes).map(key => `.${key}`);

				throw new TypeError(`${lockedExtensions.slice(0, -1).join(', ')}, and ${lockedExtensions.slice(-1)} files can only be enabled using ’true’ because their default import type cannot be overridden, found ${JSON.stringify(extension)}: ${JSON.stringify(type)} instead.`);
			}

			return lockedModuleTypes[extension];
		}

		if (!acceptedModuleTypes.has(type)) {
			throw new TypeError(`An extension's module type can only be one of ("${[...acceptedModuleTypes].join('" | "')}"), found ${JSON.stringify(extension)}: ${JSON.stringify(type)} instead.`);
		}

		return type;
	};

	const createModuleTypesFromExtensionsObject = extensionsObject => {
		const configuredModuleTypes = {};

		for (const [extension, type] of Object.entries(extensionsObject)) {
			configuredModuleTypes[extension] = validateAndGetModuleType(extension, type);
		}

		return configuredModuleTypes;
	};

	const createModuleTypesFromExtensionsArray = extensions => {
		const generatedModuleTypes = {};

		for (const extension of extensions) {
			if (Reflect.has(lockedModuleTypes, extension)) {
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
