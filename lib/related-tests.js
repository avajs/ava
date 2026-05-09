import path from 'node:path';

import {nodeFileTrace} from '@vercel/nft';

const toRelativePath = (projectDir, file) => path.relative(projectDir, path.resolve(projectDir, file));

const traceOptions = projectDir => ({
	analysis: {
		emitGlobs: false,
		computeFileReferences: false,
		evaluatePureExpressions: true,
	},
	base: projectDir,
	conditions: ['node'],
	exportsOnly: true,
	ignore: ['**/node_modules/**'],
});

function findDependingTests({changedFile, reasons, testFiles}) {
	const dependingTests = new Set();
	const visited = new Set();
	const todo = [changedFile];

	while (todo.length > 0) {
		const file = todo.pop();
		if (visited.has(file)) {
			continue;
		}

		visited.add(file);
		if (testFiles.has(file)) {
			dependingTests.add(file);
			continue;
		}

		const reason = reasons.get(file);
		if (reason === undefined) {
			return null;
		}

		todo.push(...reason.parents);
	}

	return dependingTests;
}

export async function selectRelatedTests({changedFiles, projectDir, testFiles}) {
	const relativeTestFiles = new Map(testFiles.map(file => [toRelativePath(projectDir, file), file]));
	const relativeChangedFiles = changedFiles.map(file => toRelativePath(projectDir, file));
	const selected = new Set();
	const {fileList, reasons} = await nodeFileTrace([...relativeTestFiles.keys()], traceOptions(projectDir));
	const tracedFiles = new Set(fileList);
	const testFileSet = new Set(relativeTestFiles.keys());

	for (const changedFile of relativeChangedFiles) {
		if (relativeTestFiles.has(changedFile)) {
			selected.add(relativeTestFiles.get(changedFile));
			continue;
		}

		if (!tracedFiles.has(changedFile)) {
			return testFiles;
		}

		const dependingTests = findDependingTests({changedFile, reasons, testFiles: testFileSet});
		if (dependingTests === null || dependingTests.size === 0) {
			return testFiles;
		}

		for (const testFile of dependingTests) {
			selected.add(relativeTestFiles.get(testFile));
		}
	}

	return [...selected];
}
