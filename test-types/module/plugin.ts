import * as plugin from 'ava/plugin';
import {expectType} from 'tsd';

expectType<plugin.SharedWorker.Plugin.Protocol>(plugin.registerSharedWorker({filename: '', supportedProtocols: ['ava-4']}));

const factory: plugin.SharedWorker.Factory = ({negotiateProtocol}) => {
	const protocol = negotiateProtocol(['ava-4']);
	expectType<plugin.SharedWorker.Protocol>(protocol);

	(async () => {
		for await (const w of protocol.testWorkers()) {
			expectType<() => Promise<void>>(w.teardown(() => {})); // eslint-disable-line @typescript-eslint/no-empty-function
			expectType<() => Promise<void>>(w.teardown(async () => {})); // eslint-disable-line @typescript-eslint/no-empty-function
		}
	})();
};

export default factory;
