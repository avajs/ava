import fs from 'node:fs';

import {test} from 'tap';

import normalizeNodeInternalLocations from '../helper/normalize-node-internal-locations.js';

test('TAP diagnostics retain internal frame identity without Node patch line numbers', t => {
	const output = [
		'not ok 1 - SyntaxError: Unexpected token \'do\'',
		'  ---',
		'    name: SyntaxError',
		'    message: Unexpected token \'do\'',
		'    at: \'compileSourceTextModule (node:internal/modules/esm/utils:319:16)\'',
		'  ...',
		'not ok 2 - other failure',
		'  ---',
		'    at: \'node:internal/modules/esm/loader:123:45\'',
		'  ...',
	].join('\n');
	t.equal(normalizeNodeInternalLocations(output), output
		.replace('utils:319:16', 'utils')
		.replace('loader:123:45', 'loader'));
	t.equal(normalizeNodeInternalLocations(output.replaceAll('\n', '\r\n')), normalizeNodeInternalLocations(output).replaceAll('\n', '\r\n'));
	t.end();
});

test('Node patch offsets converge while error text, frame identity and ordering remain asserted', t => {
	for (const [version, oldLine, newLine] of [['24', 318, 319], ['26', 354, 355]]) {
		const expected = fs.readFileSync(new URL(`tap.edgecases.v${version}.log`, import.meta.url), 'utf8');
		const actual = expected.replace(`utils:${oldLine}:16`, `utils:${newLine}:16`);
		t.not(actual, expected, `Node ${version} reproduces the observed offset change`);
		t.equal(normalizeNodeInternalLocations(actual), normalizeNodeInternalLocations(expected));
		t.not(normalizeNodeInternalLocations(expected.replace('Unexpected token \'do\'', 'different syntax error')), normalizeNodeInternalLocations(expected));
		t.not(normalizeNodeInternalLocations(expected.replace('compileSourceTextModule', 'differentFunction')), normalizeNodeInternalLocations(expected));
		t.not(normalizeNodeInternalLocations(expected.replace('node:internal/modules/esm/utils', 'node:internal/modules/esm/loader')), normalizeNodeInternalLocations(expected));
		t.not(normalizeNodeInternalLocations(expected.replace('throws.js:1:7', 'throws.js:1:8')), normalizeNodeInternalLocations(expected));
		t.not(normalizeNodeInternalLocations(expected.replace('import-and-use-test-member.js:3:1', 'import-and-use-test-member.js:4:1')), normalizeNodeInternalLocations(expected));
	}

	t.end();
});

test('user locations, messages and non-diagnostic output keep their exact coordinates', t => {
	const output = [
		'    at: \'compileSourceTextModule (node:internal/modules/esm/utils:319:16)\'',
		'  ---',
		'    message: \'node:internal/modules/esm/utils:319:16\'',
		'    message: |-',
		'      at: \'compileSourceTextModule (node:internal/modules/esm/utils:319:16)\'',
		'    at: \'Object.<anonymous> (~/test.js:1:7)\'',
		'    at: \'file:///project/node:internal/user.js:3:4\'',
		'    stack: |-',
		'      at functionName (node:internal/modules/esm/utils:319:16)',
		'      at userFunction (/project/test.js:12:34)',
		'  ...',
	].join('\n');
	t.equal(normalizeNodeInternalLocations(output), output);
	t.end();
});
