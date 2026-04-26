import * as globs from './globs.js';
import pkg from './pkg.js';

// Provides an integer representation of the protocol level. This is internal to a particular AVA installation, and
// allows other parts of AVA to assert minimum protocol levels for certain features without having to hardcode
// identifier strings. Integer values can be reused across protocols when older identifiers are removed.
export const levels = {
	ava8: 1,
};

const levelsByProtocol = Object.assign(Object.create(null), {
	'ava-8': levels.ava8,
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
