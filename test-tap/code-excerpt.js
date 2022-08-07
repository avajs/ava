import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

import {Chalk} from 'chalk'; // eslint-disable-line unicorn/import-style
import {test} from 'tap';
import tempWrite from 'temp-write';

import {set as setChalk} from '../lib/chalk.js';
import codeExcerpt from '../lib/code-excerpt.js';

setChalk({level: 1});

const chalk = new Chalk({level: 1});

test('read code excerpt', t => {
	const file = pathToFileURL(tempWrite.sync([
		'function a() {',
		'\talert();',
		'}',
	].join('\n')));

	const excerpt = codeExcerpt({file, line: 2, isWithinProject: true, isDependency: false});
	const expected = [
		` ${chalk.grey('1:')} function a() {`,
		chalk.bgRed.bold(' 2:   alert();    '),
		` ${chalk.grey('3:')} }             `,
	].join('\n');

	t.equal(excerpt, expected);
	t.end();
});

test('truncate lines', t => {
	const file = pathToFileURL(tempWrite.sync([
		'function a() {',
		'\talert();',
		'}',
	].join('\n')));

	const excerpt = codeExcerpt({file, line: 2, isWithinProject: true, isDependency: false}, {maxWidth: 14});
	const expected = [
		` ${chalk.grey('1:')} functio…`,
		chalk.bgRed.bold(' 2:   alert…'),
		` ${chalk.grey('3:')} }       `,
	].join('\n');

	t.equal(excerpt, expected);
	t.end();
});

test('format line numbers', t => {
	const file = pathToFileURL(tempWrite.sync([
		'',
		'',
		'',
		'',
		'',
		'',
		'',
		'',
		'function a() {',
		'\talert();',
		'}',
	].join('\n')));

	const excerpt = codeExcerpt({file, line: 10, isWithinProject: true, isDependency: false});
	const expected = [
		` ${chalk.grey(' 9:')} function a() {`,
		chalk.bgRed.bold(' 10:   alert();    '),
		` ${chalk.grey('11:')} }             `,
	].join('\n');

	t.equal(excerpt, expected);
	t.end();
});

test('noop if file cannot be read', t => {
	const file = pathToFileURL(tempWrite.sync(''));
	fs.unlinkSync(file);

	const excerpt = codeExcerpt({file, line: 10, isWithinProject: true, isDependency: false});
	t.equal(excerpt, null);
	t.end();
});

test('noop if file is not within project', t => {
	const excerpt = codeExcerpt({isWithinProject: false, file: import.meta.url, line: 1});
	t.equal(excerpt, null);
	t.end();
});

test('noop if file is a dependency', t => {
	const excerpt = codeExcerpt({isWithinProject: true, isDependency: true, file: import.meta.url, line: 1});
	t.equal(excerpt, null);
	t.end();
});
