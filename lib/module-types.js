const requireTrueValue = (value, extension) => {
	if (value !== true) {
		throw new TypeError(`When specifying module types, use \`true\` for \u2018${extension}\u2019 extensions`);
	}
};

const normalize = (extension, type) => {
	switch (extension) {
		case 'mjs': {
			requireTrueValue(type, extension);
			return 'module';
		}

		case 'js': {
			requireTrueValue(type, extension);
			return 'module';
		}

		default: {
			if (type !== 'module') {
				throw new TypeError(`Module type for \u2018${extension}\u2019 must be \u2018module\u2019`);
			}

			return type;
		}
	}
};

const deriveFromObject = extensionsObject => {
	const moduleTypes = {};
	for (const [extension, type] of Object.entries(extensionsObject)) {
		moduleTypes[extension] = normalize(extension, type);
	}

	return moduleTypes;
};

const deriveFromArray = extensions => {
	const moduleTypes = {};
	for (const extension of extensions) {
		switch (extension) {
			case 'mjs': {
				moduleTypes.mjs = 'module';
				break;
			}

			case 'js': {
				moduleTypes.js = 'module';
				break;
			}

			default: {
				moduleTypes[extension] = 'module';
			}
		}
	}

	return moduleTypes;
};

export default function moduleTypes(configuredExtensions) {
	if (configuredExtensions === undefined) {
		return {
			mjs: 'module',
			js: 'module',
		};
	}

	if (Array.isArray(configuredExtensions)) {
		return deriveFromArray(configuredExtensions);
	}

	return deriveFromObject(configuredExtensions);
}
