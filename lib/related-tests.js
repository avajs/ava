import fs from 'node:fs';
import path from 'node:path';

import {nodeFileTrace} from '@vercel/nft';

import {findTests} from './globs.js';

function normalizeKey(file, projectDir) {
	return path.isAbsolute(file) ? file : path.resolve(projectDir, file);
}

// Walks the reverse of the dependency graph (importers, starting at the given
// files, following every file that imports them) collecting the test files that
// transitively depend on them.
function selectRelatedTestFilesFromTrace({reasons, testFiles, sourceFiles, projectDir}) {
	const related = new Set();
	const todo = [...sourceFiles];
	const visited = new Set();

	while (todo.length > 0) {
		const file = todo.pop();
		const normalized = normalizeKey(file, projectDir);
		if (visited.has(normalized)) {
			continue;
		}

		visited.add(normalized);
		if (testFiles.has(normalized)) {
			related.add(normalized);
		}

		const reason = reasons.get(file) ?? reasons.get(path.relative(projectDir, file));
		if (reason === undefined) {
			continue;
		}

		for (const parent of reason.parents) {
			todo.push(normalizeKey(parent, projectDir));
		}
	}

	return related;
}

// Given changed source files, determine the test files that depend on them,
// directly or transitively.
//
// `files`: user-provided paths, absolute or relative to `cwd`; treated as plain
// file paths, not glob patterns.
//
// Returns {files, related, missing}: `files` are the resolved source files and
// `related` the depending test files, both as `projectDir`-relative paths;
// `missing` holds the provided files that do not exist.
export async function selectRelatedTestFiles({cwd, extensions, filePatterns, projectDir = cwd, files}) {
	if (cwd === undefined) {
		throw new Error('The ’cwd’ configuration must be provided.');
	}

	if (filePatterns === undefined || !Array.isArray(filePatterns) || filePatterns.length === 0) {
		throw new Error('The ’filePatterns’ configuration must be an array containing glob patterns.');
	}

	const sourceFiles = new Set();
	const missing = [];
	for (const file of files) {
		const resolved = path.resolve(cwd, file);
		if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
			missing.push(file);
			continue;
		}

		sourceFiles.add(resolved);
	}

	if (sourceFiles.size === 0) {
		return {files: [], related: [], missing};
	}

	const testFiles = new Set((await findTests({cwd: projectDir, extensions, filePatterns})));

	// The trace options match the watch-mode tracer in './watcher.js'.
	const {reasons} = await nodeFileTrace([...testFiles, ...sourceFiles], {
		analysis: { // Only trace exact imports.
			emitGlobs: false,
			computeFileReferences: false,
			evaluatePureExpressions: true,
		},
		base: projectDir,
		cache: Object.create(null),
		conditions: ['node'],
		exportsOnly: true, // Disregard "main" in package files when "exports" is present.
		ignore: ['**/node_modules/**'], // Don't trace through installed dependencies.
	});

	const related = selectRelatedTestFilesFromTrace({
		reasons,
		testFiles,
		sourceFiles,
		projectDir,
	});
	const relative = file => path.relative(projectDir, file);
	return {
		files: [...sourceFiles].map(file => relative(file)).toSorted((a, b) => a.localeCompare(b)),
		related: [...related].map(file => relative(file)).toSorted((a, b) => a.localeCompare(b)),
		missing,
	};
}
