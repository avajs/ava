// TypeScript definitions are generated here.
// ava allows chaining of function names, like `test.after.cb.always`.
// The order of these names is not important.
// Writing these definitions by hand is hard. Because of chaining,
// the number of combinations grows fast (2^n). To reduce this number,
// illegal combinations are filtered out in `verify`.
// The order of the options is not important. We could generate full
// definitions for each possible order, but that would give a very big
// output. Instead, we write an alias for different orders. For instance,
// `after.cb` is fully written, and `cb.after` is emitted as an alias
// using `typeof after.cb`.

var path = require('path');
var fs = require('fs');

var base = fs.readFileSync(path.join(__dirname, 'base.d.ts')).toString();

// All suported function names
var allParts = ['serial', 'before', 'after', 'skip', 'todo', 'failing', 'only', 'beforeEach', 'afterEach', 'cb', 'always'];

var output = base + generatePrefixed([]);
fs.writeFileSync(path.join(__dirname, 'generated.d.ts'), output);

// Generates type definitions, for the specified prefix
// The prefix is an array of function names
function generatePrefixed(prefix) {
	var output = 'export namespace ' + ['test'].concat(prefix).join('.') + ' {\n';
	
	var children = '';
	var empty = true;
	for (var i = 0; i < allParts.length; i++) {
		var part = allParts[i];
		var parts = prefix.concat([part]);
		
		if (prefix.indexOf(part) !== -1 || !verify(parts, true)) {
			// Function already in prefix or not allowed here
			continue;
		}
		
		// Check that `part` is a valid function name.
		// `always` is a valid prefix, for instance of `always.after`,
		// but not a valid function name.
		if (verify(parts, false)) {
			empty = false;
			if (!isSorted(parts)) {
				output += '\t' + 'export const ' + part + ': typeof test.' + parts.sort().join('.') + ';\n';
				continue;
			} else if (parts.indexOf('todo') !== -1) {
				output += '\t' + writeFunction(part, 'name: string', 'void');
			} else {
				var type = testType(parts);
				output += '\t' + writeFunction(part, 'name: string, implementation: ' + type);
				output += '\t' + writeFunction(part, 'implementation: ' + type);
			}
		}
		
		children += generatePrefixed(parts);
	}
	if (empty) {
		output = '';
	} else {
		output += '}\n';
	}
	return output + children;
}
function writeFunction(name, args) {
	return 'export function ' + name + '(' + args + '): void;\n';
}

function verify(parts, asPrefix) {
	var has = arrayHas(parts);
	if (has('only') + has('skip') + has('todo') > 1) return false;
	var beforeAfterCount = has('before') + has('beforeEach') + has('after') + has('afterEach');
	if (beforeAfterCount > 1) return false;
	if (beforeAfterCount === 1) {
		if (has('only')) return false;
	}
	
	if (has('always')) {
		// `always` can only be used with `after` or `afterEach`.
		// Without it can still be a valid prefix
		if (has('after') || has('afterEach')) {
			if (!asPrefix) return false;
		} else if (!verify(parts.concat(['after'])) && !verify(parts.concat(['afterEach']))) {
			// If `after` nor `afterEach` cannot be added to this prefix,
			// `always` is not allowed here.
			return false;
		}
	}
	
	return true;
}
// Checks that an array is sorted
function isSorted(a) {
	for (var i = 1; i < a.length; i++) {
		if (a[i - 1] >= a[i]) {
			return false;
		}
	}
	return true;
}
// Returns the type name of for the test implementation
function testType(parts) {
	var has = arrayHas(parts);
	var type = 'Test';
	if (has('cb')) type = 'Callback' + type;
	if (!has('beforeEach') && !has('afterEach')) type = 'Contextual' + type;
	return type;
}
function arrayHas(parts) {
	return function(part) {
		return parts.indexOf(part) !== -1;
	}
}
