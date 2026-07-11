import fs from 'node:fs';
import path from 'node:path';

const IMPORT_RE = /(?:import|export)\b[^'"]*?\bfrom\s*(['"])([^'"]+)\1/g;
const SIDE_EFFECT_RE = /(?:^|;|})\s*import\s*(['"])([^'"]+)\1/g;
const REQUIRE_RE = /require\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*(['"])([^'"]+)\1\s*\)/g;

const RESOLVE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.tsx', '.jsx', '.node'];

function extractSpecifiers(source) {
	let match;
	const specifiers = [];
	while ((match = IMPORT_RE.exec(source)) !== null) {
		specifiers.push(match[2]);
	}

	while ((match = SIDE_EFFECT_RE.exec(source)) !== null) {
		specifiers.push(match[2]);
	}

	while ((match = REQUIRE_RE.exec(source)) !== null) {
		specifiers.push(match[2]);
	}

	while ((match = DYNAMIC_IMPORT_RE.exec(source)) !== null) {
		specifiers.push(match[2]);
	}

	return specifiers;
}

// Resolve a bare or relative specifier to an absolute file path within the
// project. Returns `null` for external (bare package) specifiers or when the
// target cannot be located on disk.
function resolveSpecifier(specifier, fromFile, projectDir) {
	if (specifier.startsWith('.')) {
		const base = path.resolve(path.dirname(fromFile), specifier);
		const candidates = [base, ...RESOLVE_EXTENSIONS.map(extension => base + extension)];
		for (const candidate of candidates) {
			if (tryStat(candidate)?.isFile()) {
				return candidate;
			}
		}

		for (const extension of RESOLVE_EXTENSIONS) {
			const indexFile = path.join(base, `index${extension}`);
			if (tryStat(indexFile)?.isFile()) {
				return indexFile;
			}
		}

		return null;
	}

	if (path.isAbsolute(specifier)) {
		const normalized = path.resolve(projectDir, specifier.slice(1));
		const candidates = [normalized, ...RESOLVE_EXTENSIONS.map(extension => normalized + extension)];
		for (const candidate of candidates) {
			if (tryStat(candidate)?.isFile()) {
				return candidate;
			}
		}

		return null;
	}

	// Bare specifier (external dependency). Not part of the project's own
	// source graph, so it cannot relate a test to a changed project file.
	return null;
}

function tryStat(file) {
	try {
		return fs.statSync(file);
	} catch {
		return null;
	}
}

function readSource(file) {
	try {
		return fs.readFileSync(file, 'utf8');
	} catch {
		return '';
	}
}

// Walk the import graph starting from `file`, collecting every project source
// file that is (transitively) reachable. `visited` guards against cycles.
function collectReachable(file, projectDir, visited, reachable) {
	if (visited.has(file)) {
		return;
	}

	visited.add(file);

	const source = readSource(file);
	if (source === '') {
		return;
	}

	const specifiers = extractSpecifiers(source);
	for (const specifier of specifiers) {
		const resolved = resolveSpecifier(specifier, file, projectDir);
		if (resolved === null || !resolved.startsWith(projectDir)) {
			continue;
		}

		reachable.add(resolved);
		collectReachable(resolved, projectDir, visited, reachable);
	}
}

// Build a reverse map: absolute source file -> set of test files that import it
// (directly or transitively).
function buildReverseMap(testFiles, projectDir) {
	const reverseMap = new Map();
	for (const testFile of testFiles) {
		const reachable = new Set();
		collectReachable(testFile, projectDir, new Set(), reachable);
		for (const source of reachable) {
			if (!reverseMap.has(source)) {
				reverseMap.set(source, new Set());
			}

			reverseMap.get(source).add(testFile);
		}
	}

	return reverseMap;
}

function normalizeRelatedTo(relatedTo, projectDir) {
	const entries = Array.isArray(relatedTo) ? relatedTo : [relatedTo];
	const resolved = new Set();
	for (const entry of entries) {
		for (const part of String(entry).split(/[\s,]+/).filter(Boolean)) {
			resolved.add(path.resolve(projectDir, part));
		}
	}

	return resolved;
}

// Create a `testFileSelector` that restricts the run to test files which import
// (transitively) at least one of the `relatedTo` source files.
//
// This mirrors the behaviour of `jest --findRelatedTests`: given a set of
// changed source files, only the tests that (transitively) depend on them are
// executed. It is intended for pre-commit hooks (e.g. lint-staged) where only a
// subset of the project changed.
export function createRelatedTestSelector(relatedTo, projectDir) {
	const relatedAbs = normalizeRelatedTo(relatedTo, projectDir);

	return (testFiles, selectedFiles) => {
		if (relatedAbs.size === 0) {
			return selectedFiles;
		}

		const reverseMap = buildReverseMap(testFiles, projectDir);
		const universe = selectedFiles.length > 0 ? selectedFiles : testFiles;

		const result = [];
		for (const testFile of universe) {
			for (const source of relatedAbs) {
				if (reverseMap.get(source)?.has(testFile)) {
					result.push(testFile);
					break;
				}
			}
		}

		return result;
	};
}
