const config = require('.');

export default {
	environmentVariables: {[config.name]: config.value}
};
