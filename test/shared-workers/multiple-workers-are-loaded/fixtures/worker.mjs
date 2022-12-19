export default async ({negotiateProtocol}) => {
	const protocol = negotiateProtocol(['ava-4']);

	await protocol.ready();

	for await (const testWorker of protocol.testWorkers()) {
		testWorker.publish(protocol.initialData);
	}
};
