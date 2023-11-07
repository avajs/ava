import * as globs from './globs.js';
import pkg from './pkg.cjs';

export const levels = {
	// As the protocol changes, comparing levels by integer allows AVA to be
	// compatible with different versions.
	ava6: 1,
};

const levelsByProtocol = Object.assign(Object.create(null), {
	'ava-6': levels.ava6,
});

async function load(providerModule, projectDir, selectProtocol = () => true) {
	const ava = {version: pkg.version};
	const {default: makeProvider} = await import(providerModule);

	let fatal;
	let level;
	const provider = makeProvider({
		negotiateProtocol(identifiers, {version}) {
			const identifier = identifiers
				.find(identifier => selectProtocol(identifier) && Object.hasOwn(levelsByProtocol, identifier));

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
	async typescript(projectDir, {protocol} = {}) {
		return load('@ava/typescript', projectDir, identifier => protocol === undefined || identifier === protocol);
	},
};

export default providerManager;
