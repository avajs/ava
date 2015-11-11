var Promise = require('bluebird');

// global Promise for zen-observable
if (!global.Promise) {
	Object.defineProperty(global, 'Promise', {
		value: Promise,
		configurable: true,
		enumerable: false,
		writable: true
	});
}

module.exports = require('zen-observable');
