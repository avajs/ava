import {syncBuiltinESMExports} from 'node:module';
import process from 'node:process';
import workerThreads from 'node:worker_threads';

const OriginalWorker = workerThreads.Worker;
workerThreads.Worker = class extends OriginalWorker {
	constructor(filename, options) {
		if (String(filename).endsWith('/reporter-loader.js')) {
			process.stderr.write('reporter-plugin-thread\n');
			if (process.env.PLUGIN_TEST_SCENARIO) {
				const scenario = process.env.PLUGIN_TEST_SCENARIO;
				options = {
					...options,
					workerData: {...options.workerData, filename: new URL(`plugin.js?namespace=tap&scenario=${scenario}`, import.meta.url).href},
				};
			}
		}

		super(filename, options);
	}
};
syncBuiltinESMExports();
