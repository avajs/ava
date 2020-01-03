const pkg = require('../package.json');
const globs = require('./globs');

module.exports = ({projectDir}) => {
	const ava = {version: pkg.version};
	const makeProvider = require('@ava/babel');

	let fatal;
	const provider = makeProvider({
		negotiateProtocol(identifiers) {
			// TODO: Settle on a identifier before releasing AVA@3; fix error message.
			if (!identifiers.includes('1')) {
				fatal = new Error('TODO: Throw error when @ava/babel does not negotiate the expected protocol');
				return null;
			}

			return {
				ava,
				async findFiles({extensions, patterns}) {
					return globs.findFiles({cwd: projectDir, extensions, filePatterns: patterns});
				},
				identifier: '1',
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
