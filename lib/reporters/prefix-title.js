import path from 'node:path';

import figures from 'figures';

import {chalk} from '../chalk.js';

const SEPARATOR = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

export function titlePrefix(extensions, base, file) {
	const parts = file
		// Only replace base if it is found at the start of the path
		.replace(base, (match, offset) => offset === 0 ? '' : match)
		.split(path.sep)
		.filter(p => p !== '__tests__');

	const filename = parts.pop()
		.replace(/\.spec\./, '.')
		.replace(/\.test\./, '.')
		.replace(/^test-/, '')
		.replace(new RegExp(`.(${extensions.join('|')})$`), '');

	return [...parts, filename];
}

export default function prefixTitle(extensions, base, file, title) {
	return [...titlePrefix(extensions, base, file), title].join(SEPARATOR);
}
