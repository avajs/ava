const pkg = require('../package.json');
const globs = require('./globs');

const levels = {
	ava3: 1,
	pathRewrites: 2
};

exports.levels = levels;

const levelsByProtocol = {
	'ava-3': levels.ava3,
	'ava-3.2': levels.pathRewrites
};

function load(providerModule, projectDir) {
	const ava = {version: pkg.version};
	const makeProvider = require(providerModule);

	let fatal;
	let level;
	const provider = makeProvider({
		negotiateProtocol(identifiers, {version}) {
			const [identifier] = identifiers.filter(identifier => Reflect.has(levelsByProtocol, identifier));

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

exports.babel = projectDir => load('@ava/babel', projectDir);
exports.typescript = projectDir => load('@ava/typescript', projectDir);
