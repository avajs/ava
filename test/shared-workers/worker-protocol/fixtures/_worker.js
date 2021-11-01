export default async ({negotiateProtocol}) => {
	const protocol = negotiateProtocol(['ava-4']);

	// When we're ready to receive workers or messages.
	protocol.ready();
	// Calling it twice is harmless.
	protocol.ready();

	echo(protocol.subscribe());
	handleWorkers(protocol);
};

const handled = new WeakSet();

async function echo(messages) {
	for await (const message of messages) {
		if (!handled.has(message)) {
			handled.add(message);
			echo(message.reply(message.data).replies());
		}
	}
}

async function handleWorkers(protocol) {
	for await (const testWorker of protocol.testWorkers()) {
		testWorker.teardown(() => {
			protocol.broadcast({cleanup: testWorker.file});
		});

		let byeCount = 0;
		const bye = testWorker.teardown(() => {
			byeCount++;
			setImmediate(() => {
				protocol.broadcast({bye: testWorker.file, byeCount});
			});
		});

		testWorker.publish({hello: testWorker.file});
		echo(protocol.broadcast({broadcast: testWorker.file}).replies());
		echo(testWorker.subscribe());

		for await (const message of testWorker.subscribe()) {
			if (message.data === '👋') {
				bye();
				bye(); // Second call is a no-op.
				break;
			}
		}
	}
}
