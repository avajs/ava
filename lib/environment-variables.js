'use strict';
function validateEnvironmentVariables(environmentVariables) {
	if (!environmentVariables) {
		return {};
	}

	for (const value of Object.values(environmentVariables)) {
		if (typeof value !== 'string') {
			throw new TypeError('The ’environmentVariables’ configuration must be an object containing string values.');
		}
	}

	return environmentVariables;
}

module.exports = validateEnvironmentVariables;
