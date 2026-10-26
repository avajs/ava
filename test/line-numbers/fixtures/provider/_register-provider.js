import {registerHooks} from 'node:module';
import process from 'node:process';

registerHooks({
	resolve(specifier, context, nextResolve) {
		// This fixture can be copied outside the repository for watch-mode tests.
		if (specifier === 'ava' && process.env.TEST_AVA_IMPORT_FROM) {
			return {url: process.env.TEST_AVA_IMPORT_FROM, shortCircuit: true};
		}

		return specifier === '@ava/typescript'
			? {url: new URL('_provider.js', import.meta.url).href, shortCircuit: true}
			: nextResolve(specifier, context);
	},
});
