const pkg = require('../package.json');

module.exports = ({projectDir}) => {
	const ava = {version: pkg.version};
	const makeProvider = require('@ava/babel');

	let fatal;
	const provider = makeProvider({
		negotiateProtocol(identifiers) {
			// TODO: Settle on a identifier before releasing AVA@3; fix error message.
			if (!identifiers.includes('noBabelOutOfTheBox')) {
				fatal = new Error('TODO: Throw error when @ava/babel does not negotiate the expected protocol');
				return null;
			}

			return {identifier: 'noBabelOutOfTheBox', ava, projectDir};
		}
	});

	if (fatal) {
		throw fatal;
	}

	return provider;
};
