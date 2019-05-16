const config = require('.');

export default {
	environmentVariables: {[config.name]: config.defaultValue}
};
