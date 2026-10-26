import {registerHooks} from 'node:module';

registerHooks({
	resolve(specifier, context, nextResolve) {
		return specifier === '@ava/typescript'
			? {url: new URL('_provider.js', import.meta.url).href, shortCircuit: true}
			: nextResolve(specifier, context);
	},
});
