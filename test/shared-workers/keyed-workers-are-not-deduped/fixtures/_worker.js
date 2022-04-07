import crypto from 'node:crypto';

export default async ({negotiateProtocol}) => {
	const protocol = negotiateProtocol(['ava-4']).ready();

	const random = crypto.randomBytes(16).toString('hex');
	for await (const testWorker of protocol.testWorkers()) {
		testWorker.publish({random});
	}
};
