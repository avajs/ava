import {syncBuiltinESMExports} from 'node:module';
import process from 'node:process';
import workerThreads from 'node:worker_threads';

const OriginalWorker = workerThreads.Worker;
workerThreads.Worker = class extends OriginalWorker {
	constructor(filename, options) {
		if (String(filename).endsWith('/reporter-loader.js')) {
			process.stderr.write('reporter-plugin-thread\n');
			if (process.env.PLUGIN_TEST_CRASH) {
				options = {
					...options,
					workerData: {...options.workerData, filename: new URL('plugin.js?namespace=tap&scenario=crash', import.meta.url).href},
				};
			}
		}

		super(filename, options);
	}
};
syncBuiltinESMExports();
