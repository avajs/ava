'use strict';

// utility to send messages to processes
module.exports = function (worker, name, data) {
	if (typeof worker === 'string') {
		data = name || {};
		name = worker;
		worker = self;
	}

	var event = {
		name: 'ava-' + name,
		data: data,
		ava: true
	};

	worker.postMessage(event);
};
