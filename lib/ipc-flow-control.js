// Manage how quickly messages are delivered to the channel. In theory, we
// should be able to call `send()` until it returns `false` but this leads to
// crashes with advanced serialization, see
// <https://github.com/nodejs/node/issues/34797>.
//
// Even if that's fixed (and the Node.js versions with the fixes are the
// minimally supported versions) we need flow control based on `send()`'s return
// value.

function controlFlow(channel) {
	let sending = false;

	const buffer = [];
	const deliverNext = () => {
		if (!channel.connected) {
			buffer.length = 0;
		}

		if (buffer.length === 0) {
			sending = false;
			return;
		}

		channel.send(buffer.shift(), deliverNext);
	};

	return message => {
		if (!channel.connected) {
			return;
		}

		buffer.push(message);
		if (!sending) {
			sending = true;
			setImmediate(deliverNext);
		}
	};
}

exports.controlFlow = controlFlow;
