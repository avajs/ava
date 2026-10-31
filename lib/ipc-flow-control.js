export function controlFlow(channel) {
	let didError = false;
	let canDeliverImmediately = true;

	const backlog = [];
	const deliverNext = error => {
		if (error !== null) {
			didError = true;
		}

		if (didError || !channel.connected) {
			backlog.length = 0; // Free memory.
			return; // We can't send.
		}

		let isOk = true;
		while (isOk && backlog.length > 0) { // Stop sending after backpressure.
			isOk = channel.send(backlog.shift(), deliverNext);
		}

		// Re-enable immediate delivery if there is no backpressure and the backlog
		// has been cleared.
		canDeliverImmediately = isOk && backlog.length === 0;
	};

	return message => {
		if (didError || !channel.connected) {
			return;
		}

		if (canDeliverImmediately) {
			canDeliverImmediately = channel.send(message, deliverNext);
		} else {
			backlog.push(message);
		}
	};
}
