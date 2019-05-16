'use strict';
const name = 'MY_ENVIRONMENT_VARIABLE';
const value = 'some value';

module.exports = {
	name, value,
	defaultValue: `${value} (default)`,
	expectedName: `${name}_EXPECTED`
};
