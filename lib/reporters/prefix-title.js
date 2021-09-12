import path from 'node:path';

import figures from 'figures';

import {chalk} from '../chalk.js';

const SEPARATOR = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

export default function prefixTitle(extensions, base, file, title) {
	const prefix = file
		// Only replace base if it is found at the start of the path
		.replace(base, (match, offset) => offset === 0 ? '' : match)
		.replace(/\.spec/, '')
		.replace(/\.test/, '')
		.replace(/test-/g, '')
		.replace(new RegExp(`.(${extensions.join('|')})$`), '')
		.split(path.sep)
		.filter(p => p !== '__tests__')
		.join(SEPARATOR);

	return prefix + SEPARATOR + title;
}
