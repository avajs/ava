const pkg = require('../package.json');
const globs = require('./globs');

module.exports = ({projectDir}) => {
	const ava = {version: pkg.version};
	const makeProvider = require('@ava/babel');

	let fatal;
	const provider = makeProvider({
		negotiateProtocol(identifiers, {version}) {
			// TODO: Remove `-pre` before releasing AVA@3.
			if (!identifiers.includes('ava-3-pre')) {
				fatal = new Error(`This version of AVA (${ava.version}) is not compatible with@ava/babel@${version}`);
				return null;
			}

			return {
				ava,
				async findFiles({extensions, patterns}) {
					return globs.findFiles({cwd: projectDir, extensions, filePatterns: patterns});
				},
				identifier: 'ava-3-pre',
				normalizeGlobPatterns: globs.normalizePatterns,
				projectDir
			};
		}
	});

	if (fatal) {
		throw fatal;
	}

	return provider;
};
