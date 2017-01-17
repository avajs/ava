'use strict';
const stackLineRegex = /^.+ \(.+:[0-9]+:[0-9]+\)$/;

module.exports = stack => {
	return stack
		.split('\n')
		.filter(line => stackLineRegex.test(line))
		.map(line => line.trim())
		.join('\n');
};
