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
const Runner = require('../lib/runner');

const arrayHas = parts => part => parts.indexOf(part) !== -1;

const base = fs.readFileSync(path.join(__dirname, 'base.d.ts'), 'utf8');

// All suported function names
const allParts = Object.keys(new Runner({}).chain).filter(name => name !== 'test');

// The output consists of the base declarations, the actual 'test' function declarations,
// and the namespaced chainable methods.
const output = base + generatePrefixed([]);

fs.writeFileSync(path.join(__dirname, 'generated.d.ts'), output);

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
			if (exists(parts)) {
				parts.sort();

				let chain;
				if (hasChildren(parts)) {
					chain = parts.join('_') + '<T>';
				} else {
					// This is a single function, not a namespace, so there's no type associated
					// and we need to dereference it as a property type
					const last = parts.pop();
					const joined = parts.join('_');
					chain = `${joined}<T>['${last}']`;
				}

				output += `\t${part}: Register_${chain};\n`;
			}

			continue;
		}

		// Check that `part` is a valid function name.
		// `always` is a valid prefix, for instance of `always.after`,
		// but not a valid function name.
		if (verify(parts, false)) {
			if (arrayHas(parts)('todo')) {
				// 'todo' functions don't have a function argument, just a string
				output += `\t${part}: (name: string) => void;\n`;
			} else {
				if (arrayHas(parts)('cb')) {
					output += `\t${part}: CallbackRegisterBase<T>`;
				} else {
					output += `\t${part}: RegisterBase<T>`;
				}

				if (hasChildren(parts)) {
					// This chain can be continued, make the property an intersection type with the chain continuation
					const joined = parts.join('_');
					output += ` & Register_${joined}<T>`;
				}

				output += ';\n';
			}
		}

		children += generatePrefixed(parts);
	}

	if (output === '') {
		return children;
	}

	const typeBody = `{\n${output}}\n${children}`;

	if (prefix.length === 0) {
		// No prefix, so this is the type for the default export
		return `export interface Register<T> extends RegisterBase<T> ${typeBody}`;
	}
	const namespace = ['Register'].concat(prefix).join('_');
	return `interface ${namespace}<T> ${typeBody}`;
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

// Returns true if a chain can have any child properties
function hasChildren(parts) {
	// Concatenate the chain with each other part, and see if any concatenations are valid functions
	const validChildren = allParts
		.filter(newPart => parts.indexOf(newPart) === -1)
		.map(newPart => parts.concat([newPart]))
		.filter(longer => verify(longer, false));

	return validChildren.length > 0;
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
