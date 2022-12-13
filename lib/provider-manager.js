import * as globs from './globs.js';
import pkg from './pkg.cjs';

export const levels = {
	// As the protocol changes, comparing levels by integer allows AVA to be
	// compatible with different versions. Currently there is only one supported
	// version, so this is effectively unused. The infrastructure is retained for
	// future use.
	ava3Stable: 1,
	ava5Watchmode: 2,
};

const levelsByProtocol = Object.assign(Object.create(null), {
	'ava-3.2': levels.ava3Stable,
	'ava-5-watch-mode': levels.ava5Watchmode,
});

async function load(providerModule, projectDir) {
	const ava = {version: pkg.version};
	const {default: makeProvider} = await import(providerModule);

	let fatal;
	let level;
	const provider = makeProvider({
		negotiateProtocol(identifiers, {version}) {
			const identifier = identifiers.find(identifier => Reflect.has(levelsByProtocol, identifier));

			if (identifier === undefined) {
				fatal = new Error(`This version of AVA (${ava.version}) is not compatible with ${providerModule}@${version}`);
				return null;
			}

			level = levelsByProtocol[identifier];

			return {
				ava,
				async findFiles({extensions, patterns}) {
					return globs.findFiles({cwd: projectDir, extensions, filePatterns: patterns});
				},
				identifier,
				normalizeGlobPatterns: globs.normalizePatterns,
				projectDir,
			};
		},
	});

	if (fatal) {
		throw fatal;
	}

	return {...provider, level};
}

const providerManager = {
	async typescript(projectDir) {
		return load('@ava/typescript', projectDir);
	},
};

export default providerManager;
