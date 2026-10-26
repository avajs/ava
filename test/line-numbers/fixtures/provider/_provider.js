import process from 'node:process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {isMainThread} from 'node:worker_threads';

export default function makeProvider({negotiateProtocol}) {
	const identifiers = process.env.PROVIDER_PROTOCOL === 'ava-8' ? ['ava-8'] : (isMainThread ? ['ava-9', 'ava-8'] : ['ava-8', 'ava-9']);
	const protocol = negotiateProtocol(identifiers, {version: '1.0.0'});
	if (protocol === null) {
		return;
	}

	return {
		main() {
			return {
				extensions: ['ts'],
				compile: async () => ({identifier: protocol.identifier}),
				updateGlobs: globs => globs,
			};
		},
		worker({state}) {
			if (state.identifier !== protocol.identifier) {
				throw new Error('The main and worker protocols must match');
			}

			const compiled = fileURLToPath(new URL('compiled/source.js', import.meta.url));
			return {
				canLoad: reference => reference.endsWith('.ts'),
				load: reference => import(pathToFileURL(reference.endsWith('legacy.ts') ? reference : compiled)),
				...(protocol.identifier === 'ava-9' && {
					resolveFile() {
						if (process.env.RESOLVER_MUST_NOT_RUN) {
							throw new Error('The resolver must not run');
						}

						if (process.env.RESOLVER_ERROR) {
							throw new Error('resolver failed');
						}

						return compiled;
					},
				}),
			};
		},
	};
}
