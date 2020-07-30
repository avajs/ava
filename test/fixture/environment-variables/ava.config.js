const config = require('.');
const avaConfig = {
	environmentVariables: {[config.name]: config.value}
};
export default avaConfig;
