'use strict';

// utility to send messages to processes
module.exports = function (wrappedSend) {
	return function send(name, data) {
		wrappedSend({
			name: 'ava-' + name,
			data: data,
			ava: true
		});
	};
};
