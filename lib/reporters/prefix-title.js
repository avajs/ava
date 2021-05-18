import path from 'path';

import figures from 'figures';

import {chalk} from '../chalk.js';

export default (extensions, base, file, title) => {
	const separator = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

	const prefix = file
		// Only replace base if it is found at the start of the path
		.replace(base, (match, offset) => offset === 0 ? '' : match)
		.replace(/\.spec/, '')
		.replace(/\.test/, '')
		.replace(/test-/g, '')
		.replace(new RegExp(`.(${extensions.join('|')})$`), '')
		.split(path.sep)
		.filter(p => p !== '__tests__')
		.join(separator);

	return prefix + separator + title;
};
