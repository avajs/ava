'use strict';

// utility to send messages to processes
function send(ps, name, data) {
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
}

module.exports = send;
