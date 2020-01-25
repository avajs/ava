const pkg = require('../package.json');
const globs = require('./globs');

function load(providerModule, projectDir) {
	const ava = {version: pkg.version};
	const makeProvider = require(providerModule);

	let fatal;
	const provider = makeProvider({
		negotiateProtocol(identifiers, {version}) {
			if (!identifiers.includes('ava-3')) {
				fatal = new Error(`This version of AVA (${ava.version}) is not compatible with ${providerModule}@${version}`);
				return null;
			}

			return {
				ava,
				async findFiles({extensions, patterns}) {
					return globs.findFiles({cwd: projectDir, extensions, filePatterns: patterns});
				},
				identifier: 'ava-3',
				normalizeGlobPatterns: globs.normalizePatterns,
				projectDir
			};
		}
	});

	if (fatal) {
		throw fatal;
	}

	return provider;
}

exports.babel = projectDir => load('@ava/babel', projectDir);
exports.typescript = projectDir => load('@ava/typescript', projectDir);
