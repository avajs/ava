function controlFlow(channel) {
	let errored = false;
	let deliverImmediately = true;

	const backlog = [];
	const deliverNext = error => {
		if (error !== null) {
			errored = true;
		}

		if (errored || !channel.connected) {
			backlog.length = 0; // Free memory.
			return; // We can't send.
		}

		let ok = true;
		while (ok && backlog.length > 0) { // Stop sending after backpressure.
			ok = channel.send(backlog.shift(), deliverNext);
		}

		// Re-enable immediate delivery if there is no backpressure and the backlog
		// has been cleared.
		deliverImmediately = ok && backlog.length === 0;
	};

	return message => {
		if (errored || !channel.connected) {
			return;
		}

		if (deliverImmediately) {
			deliverImmediately = channel.send(message, deliverNext);
		} else {
			backlog.push(message);
		}
	};
}

exports.controlFlow = controlFlow;
