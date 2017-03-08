'use strict';

// TypeScript definitions are generated here.
// AVA allows chaining of function names, like `test.after.cb.always`.
// The order of these names is not important.
// Writing these definitions by hand is hard. Because of chaining,
// the number of combinations grows fast (2^n). To reduce this number,
// illegal combinations are filtered out in `verify`.
// The order of the options is not important. We could generate full
// definitions for each possible order, but that would give a very big
// output. Instead, we write an alias for different orders. For instance,
// `after.cb` is fully written, and `cb.after` is emitted as an alias
// using `typeof after.cb`.

const path = require('path');
const fs = require('fs');
const isArraySorted = require('is-array-sorted');
const runner = require('../lib/runner');

const arrayHas = parts => part => parts.indexOf(part) !== -1;

const base = fs.readFileSync(path.join(__dirname, 'base.d.ts'), 'utf8');

// All suported function names
const allParts = Object.keys(runner._chainableMethods).filter(name => name !== 'test');

// The output consists of the base declarations, the actual 'test' function declarations,
// and the namespaced chainable methods.
const output = [
	base,
	testFunctionDeclarations(),
	generatePrefixed([])
].join('\n');

fs.writeFileSync(path.join(__dirname, 'generated.d.ts'), output);

// Returns the declarations for the 'test' function overloads
function testFunctionDeclarations() {
	const defineTestDeclaration = 'export interface DefineTest<T> {';
	const defineTestStart = base.indexOf(defineTestDeclaration);
	if (defineTestStart === -1) {
		throw new Error(`Couldn't find ${defineTestDeclaration} in base definitions.`);
	}
	const defineTestEnd = base.indexOf('}', defineTestStart);
	if (defineTestEnd === -1) {
		throw new Error(`Expected token '}'.`);
	}
	const lines = base
		.substring(defineTestStart + defineTestDeclaration.length, defineTestEnd)
		.trim()
		.split('\n')
		.map(line => line.trim().replace(/<T>/g, '<AnyContext>'))
		.map(signature => `export function test${signature}`);

	lines.unshift('export default test;');

	return lines.join('\n');
}

// Generates type definitions, for the specified prefix
// The prefix is an array of function names
function generatePrefixed(prefix) {
	let output = '';
	let children = '';

	for (const part of allParts) {
		const parts = prefix.concat([part]);

		if (prefix.indexOf(part) !== -1 || !verify(parts, true)) {
			// Function already in prefix or not allowed here
			continue;
		}

		// If `parts` is not sorted, we alias it to the sorted chain
		if (!isArraySorted(parts)) {
			const chain = parts.sort().join('.');

			if (exists(parts)) {
				output += `\texport const ${part}: typeof test.${chain};\n`;
			}

			continue;
		}

		// Check that `part` is a valid function name.
		// `always` is a valid prefix, for instance of `always.after`,
		// but not a valid function name.
		if (verify(parts, false)) {
			if (parts.indexOf('todo') !== -1) { // eslint-disable-line no-negated-condition
				output += '\t' + writeFunction(part, 'name: string', 'void');
			} else {
				const types = testTypes(parts);
				output += '\t' + writeFunction(part, `name: string, implementation: ${types.type}`);
				output += '\t' + writeFunction(part, `implementation: ${types.type}`);
				output += '\t' + writeFunction(part, `name: string, implementation: Macros<${types.contextType}>, ...args: any[]`);
				output += '\t' + writeFunction(part, `implementation: Macros<${types.contextType}>, ...args: any[]`);
			}
		}

		children += generatePrefixed(parts);
	}

	if (output === '') {
		return children;
	}

	const namespace = ['test'].concat(prefix).join('.');

	return `export namespace ${namespace} {\n${output}}\n${children}`;
}

function writeFunction(name, args) {
	return `export function ${name}(${args}): void;\n`;
}

// Checks whether a chain is a valid function name (when `asPrefix === false`)
// or a valid prefix that could contain members.
// For instance, `test.always` is not a valid function name, but it is a valid
// prefix of `test.always.after`.
function verify(parts, asPrefix) {
	const has = arrayHas(parts);

	if (has('only') + has('skip') + has('todo') > 1) {
		return false;
	}

	const beforeAfterCount = has('before') + has('beforeEach') + has('after') + has('afterEach');

	if (beforeAfterCount > 1) {
		return false;
	}

	if (beforeAfterCount === 1) {
		if (has('only')) {
			return false;
		}
	}

	if (has('always')) {
		// `always` can only be used with `after` or `afterEach`.
		// Without it can still be a valid prefix
		if (has('after') || has('afterEach')) {
			return true;
		}

		if (!verify(parts.concat(['after']), false) && !verify(parts.concat(['afterEach']), false)) {
			// If `after` nor `afterEach` cannot be added to this prefix,
			// `always` is not allowed here.
			return false;
		}

		// Only allowed as a prefix
		return asPrefix;
	}

	return true;
}

// Checks whether a chain is a valid function name or a valid prefix with some member
function exists(parts) {
	if (verify(parts, false)) {
		// Valid function name
		return true;
	}

	if (!verify(parts, true)) {
		// Not valid prefix
		return false;
	}

	// Valid prefix, check whether it has members
	for (const prefix of allParts) {
		if (parts.indexOf(prefix) === -1 && exists(parts.concat([prefix]))) {
			return true;
		}
	}

	return false;
}

// Returns the type names for the test implementation
function testTypes(parts) {
	const has = arrayHas(parts);
	let type = 'Test';

	if (has('cb')) {
		type = `Callback${type}`;
	}

	const isGeneric = !has('before') && !has('after');
	if (isGeneric) {
		type = `Generic${type}`;
	}

	let contextType = `${type}Context`;

	if (isGeneric) {
		type = `${type}<AnyContext>`;
		contextType = `${contextType}<AnyContext>`;
	}

	return {
		type,
		contextType
	};
}
