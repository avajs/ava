import path from 'node:path';

import FileTracer from './file-tracer.js';

export default async function selectRelatedTests({projectDir, testFiles, filter}) {
	if (filter.length === 0) {
		throw new TypeError('--related requires at least one changed file path.');
	}

	const tracer = new FileTracer({base: projectDir});
	tracer.update(testFiles.map(file => ({
		path: path.relative(projectDir, file),
		exists: true,
		isTest: true,
	})));
	await tracer.busy;
	// Unresolved imports must not silently exclude potentially affected tests.
	if (tracer.warnings.size > 0) {
		return testFiles;
	}

	const selected = new Set();
	for (const {pattern} of filter) {
		const changed = path.relative(projectDir, path.resolve(projectDir, pattern));
		for (const testFile of tracer.traceToTestFile(changed, {shouldTraceTestParents: true})) {
			selected.add(path.resolve(projectDir, testFile));
		}
	}

	return testFiles.filter(file => selected.has(file));
}
