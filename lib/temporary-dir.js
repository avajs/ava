import path from 'node:path';

// Only known values are allowed, so the resolved directory is always inside the
// project. Worker processes import a stub from this directory, which therefore
// needs to be able to resolve the project's dependencies.
export const ALLOWED_TEMPORARY_DIRS = ['.ava'];

export const resolveTemporaryDir = (projectDir, temporaryDir) => temporaryDir === undefined
	? path.join(projectDir, 'node_modules', '.cache', 'ava')
	: path.join(projectDir, temporaryDir);
