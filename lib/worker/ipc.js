'use strict';

// `process.channel` was added in Node.js 7.1.0, but the channel was available
// through an undocumented API as `process._channel`.
const channel = process.channel || process._channel;

// Parse and re-emit AVA messages
process.on('message', message => {
	if (!message.ava) {
		return;
	}

	process.emit(message.name, message.data);
});

exports.send = (name, data) => {
	process.send({
		name: `ava-${name}`,
		data,
		ava: true
	});
};

let allowUnref = true;
exports.unrefChannel = () => {
	if (allowUnref) {
		channel.unref();
	}
};

exports.forceRefChannel = () => {
	allowUnref = false;
	channel.ref();
};
