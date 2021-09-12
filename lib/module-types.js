const requireTrueValue = value => {
	if (value !== true) {
		throw new TypeError('When specifying module types, use `true` for ’cjs’, ’mjs’ and ’js’ extensions');
	}
};

const normalize = (extension, type, defaultModuleType) => {
	switch (extension) {
		case 'cjs':
			requireTrueValue(type);
			return 'commonjs';
		case 'mjs':
			requireTrueValue(type);
			return 'module';
		case 'js':
			requireTrueValue(type);
			return defaultModuleType;
		default:
			if (type !== 'commonjs' && type !== 'module') {
				throw new TypeError(`Module type for ’${extension}’ must be ’commonjs’ or ’module’`);
			}

			return type;
	}
};

const deriveFromObject = (extensionsObject, defaultModuleType) => {
	const moduleTypes = {};
	for (const [extension, type] of Object.entries(extensionsObject)) {
		moduleTypes[extension] = normalize(extension, type, defaultModuleType);
	}

	return moduleTypes;
};

const deriveFromArray = (extensions, defaultModuleType) => {
	const moduleTypes = {};
	for (const extension of extensions) {
		switch (extension) {
			case 'cjs':
				moduleTypes.cjs = 'commonjs';
				break;
			case 'mjs':
				moduleTypes.mjs = 'module';
				break;
			case 'js':
				moduleTypes.js = defaultModuleType;
				break;
			default:
				moduleTypes[extension] = 'commonjs';
		}
	}

	return moduleTypes;
};

export default function moduleTypes(configuredExtensions, defaultModuleType) {
	if (configuredExtensions === undefined) {
		return {
			cjs: 'commonjs',
			mjs: 'module',
			js: defaultModuleType,
		};
	}

	if (Array.isArray(configuredExtensions)) {
		return deriveFromArray(configuredExtensions, defaultModuleType);
	}

	return deriveFromObject(configuredExtensions, defaultModuleType);
}
