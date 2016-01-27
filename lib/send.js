'use strict';

// utility to send messages to processes
module.exports = function (ps, name, data) {
	if (typeof ps === 'string') {
		data = name || {};
		name = ps;
		ps = process;
	}

	ps.send({
		name: 'ava-' + name,
		data: data,
		ava: true
	});
};
