import * as globs from './globs.js';
import pkg from './pkg.cjs';

const levels = {
	ava3: 1,
	pathRewrites: 2
};

const levelsByProtocol = {
	'ava-3': levels.ava3,
	'ava-3.2': levels.pathRewrites
};

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
				projectDir
			};
		}
	});

	if (fatal) {
		throw fatal;
	}

	return {...provider, level};
}

export default {
	levels,
	async babel(projectDir) {
		return load('@ava/babel', projectDir);
	},
	async typescript(projectDir) {
		return load('@ava/typescript', projectDir);
	}
};
