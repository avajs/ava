import fs from 'node:fs';
import os from 'node:os';
import nodePath from 'node:path';
import process from 'node:process';
import v8 from 'node:v8';

import {nodeFileTrace} from '@vercel/nft';
import createDebug from 'debug';
import split2 from 'split2';

import {chalk} from './chalk.js';
import {
	applyTestFileFilter, classify, buildIgnoreMatcher, findTests,
} from './globs.js';
import {InteractiveFilter} from './interactive-filter.js';
import {levels as providerLevels} from './provider-manager.js';

const debug = createDebug('ava:watcher');

// In order to get reliable code coverage for the tests of the watcher, we need
// to make Node.js write out interim reports in various places.
const takeCoverageForSelfTests = process.env.TEST_AVA ? v8.takeCoverage : undefined;

export function available(projectDir) {
	try {
		fs.watch(projectDir, {persistent: false, recursive: true, signal: AbortSignal.abort()});
	} catch (error) {
		if (error.code === 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM') {
			return false;
		}

		throw error;
	}

	return true;
}

async function * readLines(stream) {
	for await (const line of stream.pipe(split2())) {
		yield line.trim();
	}

	return '';
}

const eachLine = async (lineReader, callback) => {
	for await (const line of lineReader) {
		await callback(line);
	}
};

const writeCommandInstructions = (reporter, interactiveFilter) => {
	reporter.lineWriter.writeLine(chalk.gray('Type `p` followed by enter to filter test files by a regex pattern'));
	reporter.lineWriter.writeLine(chalk.gray('Type `t` followed by enter to filter tests by their title (using a regex pattern)'));
	if (interactiveFilter.hasAnyFilters()) {
		reporter.lineWriter.writeLine(chalk.gray('Type `a` followed by enter to reset filters and rerun all tests'));
		reporter.lineWriter.writeLine(chalk.gray('Type `r` followed by enter to rerun tests that match your filters'));
	} else {
		reporter.lineWriter.writeLine(chalk.gray('Type `r` followed by enter to rerun tests'));
	}

	reporter.lineWriter.writeLine(chalk.gray('Type `u` followed by enter to update snapshots in selected tests'));

	if (interactiveFilter.hasAnyFilters()) {
		reporter.lineWriter.writeLine();

		const filePathRegex = interactiveFilter.printFilePathRegex();
		if (filePathRegex) {
			reporter.lineWriter.writeLine(chalk.gray(`Current test file pattern: ${chalk.italic(filePathRegex)}`));
		}

		const testTitleRegex = interactiveFilter.printTestTitleRegex();
		if (testTitleRegex) {
			reporter.lineWriter.writeLine(chalk.gray(`Current test title pattern: ${chalk.italic(testTitleRegex)}`));
		}
	}

	reporter.lineWriter.writeLine();
	reporter.lineWriter.write('> ');
};

const promptForFileFilter = async (reporter, lineReader, currentFilterRegexOrNull) => {
	reporter.lineWriter.ensureEmptyLine();
	reporter.lineWriter.writeLine('Type the file regex pattern then press enter. Leave blank to clear.', false);
	if (currentFilterRegexOrNull !== null) {
		reporter.lineWriter.writeLine();
		reporter.lineWriter.writeLine(chalk.gray(`Current file regex pattern is: ${chalk.italic(currentFilterRegexOrNull)}`));
	}

	reporter.lineWriter.write('> ');

	const {value: patternInput = ''} = await lineReader.next();
	if (patternInput !== '') {
		try {
			return new RegExp(patternInput);
		} catch (error) {
			reporter.lineWriter.writeLine(
				chalk.gray(`Invalid regex: ${error.message}${os.EOL}`),
			);
		}
	}

	return null;
};

const promptForTitleFilter = async (reporter, lineReader, currentFilterRegexOrNull) => {
	reporter.lineWriter.ensureEmptyLine();
	reporter.lineWriter.writeLine('Type the title regex pattern then press enter. Leave blank to clear.', false);
	if (currentFilterRegexOrNull !== null) {
		reporter.lineWriter.writeLine();
		reporter.lineWriter.writeLine(chalk.gray(`Current title regex pattern is: ${chalk.italic(currentFilterRegexOrNull)}`));
	}

	reporter.lineWriter.write('> ');

	const {value: patternInput = ''} = await lineReader.next();
	if (patternInput !== '') {
		try {
			return new RegExp(patternInput);
		} catch (error) {
			reporter.lineWriter.writeLine(
				chalk.gray(`Invalid regex: ${error.message}${os.EOL}`),
			);
		}
	}

	return null;
};

export async function start({api, filter, globs, projectDir, providers, reporter, stdin, signal}) {
	providers = providers.filter(({level}) => level >= providerLevels.ava6);
	for await (const {files, ...runtimeOptions} of plan({
		api,
		filter,
		globs,
		projectDir,
		providers,
		stdin,
		abortSignal: signal,
		reporter,
	})) {
		await api.run({files, filter, runtimeOptions});
		reporter.endRun();
	}
}

async function * plan({
	api,
	filter,
	globs,
	projectDir,
	providers,
	stdin,
	abortSignal,
	reporter,
}) {
	const interactiveFilter = new InteractiveFilter();

	const fileTracer = new FileTracer({base: projectDir});
	const isIgnored = buildIgnoreMatcher(globs);
	const patternFilters = filter.map(({pattern}) => pattern);

	const statsCache = new Map();
	const fileStats = path => {
		if (statsCache.has(path)) {
			return statsCache.get(path); // N.B. `undefined` is a valid value!
		}

		const stats = fs.statSync(nodePath.join(projectDir, path), {throwIfNoEntry: false});
		statsCache.set(path, stats);
		return stats;
	};

	const fileExists = path => fileStats(path) !== undefined;
	const cwdAndGlobs = {cwd: projectDir, ...globs};
	const changeFromPath = path => {
		const {isTest} = classify(path, cwdAndGlobs);
		const stats = fileStats(path);
		return {
			path, isTest, exists: stats !== undefined, isFile: stats?.isFile() ?? false,
		};
	};

	// Begin a file trace in the background.
	fileTracer.update(findTests(cwdAndGlobs).then(testFiles => testFiles.map(path => ({ // eslint-disable-line promise/prefer-await-to-then
		path: nodePath.relative(projectDir, path),
		isTest: true,
		exists: true,
	}))));

	// State tracked for test runs.
	const touchedFiles = new Set();
	const temporaryFiles = new Set();
	const failureCounts = new Map();

	// Observe all test runs.
	api.on('run', ({status}) => {
		status.on('stateChange', evt => {
			switch (evt.type) {
				case 'accessed-snapshots': {
					fileTracer.addDependency(nodePath.relative(projectDir, evt.testFile), nodePath.relative(projectDir, evt.filename));
					break;
				}

				case 'touched-files': {
					for (const file of evt.files.changedFiles) {
						touchedFiles.add(nodePath.relative(projectDir, file));
					}

					for (const file of evt.files.temporaryFiles) {
						temporaryFiles.add(nodePath.relative(projectDir, file));
					}

					break;
				}

				case 'hook-failed':
				case 'internal-error':
				case 'process-exit':
				case 'test-failed':
				case 'uncaught-exception':
				case 'unhandled-rejection':
				case 'worker-failed': {
					const path = nodePath.relative(projectDir, evt.testFile);
					failureCounts.set(path, 1 + (failureCounts.get(path) ?? 0));
					break;
				}

				default: {
					break;
				}
			}
		});
	});

	// State for subsequent test runs.
	let signalChanged;
	let changed = Promise.resolve({});
	let firstRun = true;
	let runAll = true;
	let updateSnapshots = false;

	const reset = () => {
		changed = new Promise(resolve => {
			signalChanged = resolve;
		});
		firstRun = false;
		runAll = false;
		updateSnapshots = false;
	};

	const lineReader = readLines(stdin);

	// Don't let the reader keep the process alive.
	stdin.unref();

	// Handle commands.
	eachLine(lineReader, async line => {
		switch (line.toLowerCase()) {
			case 'r': {
				signalChanged();
				break;
			}

			case 'u': {
				updateSnapshots = true;
				signalChanged();
				break;
			}

			case 'a': {
				runAll = true;
				interactiveFilter.replaceFilepathRegex(null);
				interactiveFilter.replaceTestTitleRegex(null);
				signalChanged();
				break;
			}

			case 'p': {
				const filterHasChanged = interactiveFilter.replaceFilepathRegex(
					await promptForFileFilter(
						reporter,
						lineReader,
						interactiveFilter.fileRegexOrNull,
						'filepath',
					),
				);
				reporter.lineWriter.write(`${os.EOL}${os.EOL}`);
				writeCommandInstructions(reporter, interactiveFilter);
				if (filterHasChanged) {
					signalChanged();
				}

				break;
			}

			case 't': {
				const filterHasChanged = interactiveFilter.replaceTestTitleRegex(
					await promptForTitleFilter(
						reporter,
						lineReader,
						interactiveFilter.testTitleRegexOrNull,
						'test title',
					),
				);
				reporter.lineWriter.write(`${os.EOL}`);
				writeCommandInstructions(reporter, interactiveFilter);
				if (filterHasChanged) {
					signalChanged();
				}

				break;
			}

			default: {
				break;
			}
		}
	});

	// Whether tests are currently running. Used to control when the next run
	// is prepared.
	let testsAreRunning = false;

	// Tracks file paths we know have changed since the previous test run.
	const dirtyPaths = new Set();
	const debounce = setTimeout(() => {
		// The callback is invoked for a variety of reasons, not necessarily because
		// there are dirty paths. But if there are none, then there's nothing to do.
		if (dirtyPaths.size === 0) {
			takeCoverageForSelfTests?.();
			return;
		}

		// Equally, if tests are currently running, then keep accumulating changes.
		// The timer is refreshed after tests finish running.
		if (testsAreRunning) {
			takeCoverageForSelfTests?.();
			return;
		}

		// If the file tracer is still analyzing dependencies, wait for that to
		// complete.
		if (fileTracer.busy !== null) {
			fileTracer.busy.then(() => debounce.refresh()); // eslint-disable-line promise/prefer-await-to-then
			takeCoverageForSelfTests?.();
			return;
		}

		// Identify the changes.
		const changes = [...dirtyPaths].filter(path => {
			if (temporaryFiles.has(path)) {
				debug('Ignoring known temporary file %s', path);
				return false;
			}

			if (touchedFiles.has(path)) {
				debug('Ignoring known touched file %s', path);
				return false;
			}

			for (const {main} of providers) {
				switch (main.interpretChange(nodePath.join(projectDir, path))) {
					case main.changeInterpretations.ignoreCompiled: {
						debug('Ignoring compilation output %s', path);
						return false;
					}

					case main.changeInterpretations.waitForOutOfBandCompilation: {
						if (!fileExists(path)) {
							debug('Not waiting for out-of-band compilation of deleted %s', path);
							return true;
						}

						debug('Waiting for out-of-band compilation of %s', path);
						return false;
					}

					default: {
						continue;
					}
				}
			}

			if (isIgnored(path)) {
				debug('%s is ignored by patterns', path);
				return false;
			}

			return true;
		}).flatMap(path => {
			const change = changeFromPath(path);

			for (const {main} of providers) {
				const sources = main.resolvePossibleOutOfBandCompilationSources(nodePath.join(projectDir, path));
				if (sources === null) {
					continue;
				}

				if (sources.length === 1) {
					const [source] = sources;
					const newPath = nodePath.relative(projectDir, source);
					if (change.exists) {
						debug('Interpreting %s as %s', path, newPath);
						return changeFromPath(newPath);
					}

					debug('Interpreting deleted %s as deletion of %s', path, newPath);
					return {...changeFromPath(newPath), exists: false};
				}

				const relativeSources = sources.map(source => nodePath.relative(projectDir, source));
				debug('Change of %s could be due to deletion of multiple source files %j', path, relativeSources);
				return relativeSources.filter(possiblePath => fileTracer.has(possiblePath)).map(newPath => {
					debug('Interpreting %s as deletion of %s', path, newPath);
					return changeFromPath(newPath);
				});
			}

			return change;
		}).filter(change => {
			// Filter out changes to directories. However, if a directory was deleted,
			// we cannot tell that it used to be a directory.
			if (change.exists && !change.isFile) {
				debug('%s is not a file', change.path);
				return false;
			}

			return true;
		});

		// Stats only need to be cached while we identify changes.
		statsCache.clear();

		// Identify test files that need to be run next, and whether there are
		// non-ignored file changes that mean we should run all test files.
		const uniqueTestFiles = new Set();
		const deletedTestFiles = new Set();
		const nonTestFiles = [];
		for (const {path, isTest, exists} of changes) {
			if (!exists) {
				debug('%s was deleted', path);
			}

			if (isTest) {
				debug('%s is a test file', path);
				if (exists) {
					uniqueTestFiles.add(path);
				} else {
					failureCounts.delete(path); // Stop tracking failures for deleted tests.
					deletedTestFiles.add(path);
				}
			} else {
				debug('%s is not a test file', path);

				const dependingTestFiles = fileTracer.traceToTestFile(path);
				if (dependingTestFiles.length > 0) {
					debug('%s is depended on by test files %o', path, dependingTestFiles);
					for (const testFile of dependingTestFiles) {
						uniqueTestFiles.add(testFile);
					}
				} else {
					debug('%s is not known to be depended on by test files', path);
					nonTestFiles.push(path);
				}
			}
		}

		// One more pass to make sure deleted test files are not run. This is needed
		// because test files are selected when files they depend on are changed.
		for (const path of deletedTestFiles) {
			uniqueTestFiles.delete(path);
		}

		// Clear state from the previous run and detected file changes.
		dirtyPaths.clear();
		temporaryFiles.clear();
		touchedFiles.clear();

		// In the background, update the file tracer to reflect the changes.
		if (changes.length > 0) {
			fileTracer.update(changes);
		}

		// Select the test files to run, and how to run them.
		let testFiles = [...uniqueTestFiles];

		if (filter.length > 0) {
			testFiles = applyTestFileFilter({
				cwd: projectDir,
				expandDirectories: false,
				filter: patternFilters,
				testFiles,
				treatFilterPatternsAsFiles: false,
			});
		}

		if (nonTestFiles.length > 0) {
			debug('Non-test files changed, running all tests');
			failureCounts.clear(); // All tests are run, so clear previous failures.
			signalChanged();
		} else if (testFiles.length > 0) {
			// Remove previous failures for tests that will run again.
			for (const path of testFiles) {
				failureCounts.delete(path);
			}

			signalChanged({testFiles});
		}

		takeCoverageForSelfTests?.();
	}, 100).unref();

	// Detect changed files.
	fs.watch(projectDir, {recursive: true, signal: abortSignal}, (_, filename) => {
		if (filename !== null) {
			dirtyPaths.add(filename);
			debug('Detected change in %s', filename);
			debounce.refresh();
		}
	});

	abortSignal?.addEventListener('abort', () => {
		signalChanged?.();
	});

	// And finally, the watch loop.
	while (abortSignal?.aborted !== true) {
		const {testFiles: files = []} = (await changed) ?? {}; // eslint-disable-line no-await-in-loop

		if (abortSignal?.aborted) {
			break;
		}

		let previousFailures = 0;
		for (const count of failureCounts.values()) {
			previousFailures += count;
		}

		const instructions = {
			files: files.map(file => nodePath.join(projectDir, file)),
			firstRun, // Value is changed by refresh() so record now.
			previousFailures,
			updateSnapshots, // Value is changed by refresh() so record now.
			interactiveFilter: runAll
				? new InteractiveFilter()
				: interactiveFilter,
		};
		reset(); // Make sure the next run can be triggered.

		// Clear any prompt.
		if (!reporter.lineWriter.lastLineIsEmpty && reporter.reportStream.isTTY) {
			reporter.reportStream.clearLine(0);
			reporter.lineWriter.writeLine();
		}

		testsAreRunning = true;
		yield instructions; // Let the tests run.
		writeCommandInstructions(reporter, interactiveFilter);
		testsAreRunning = false;
		debounce.refresh(); // Trigger the callback, which if there were changes will run the tests again.
	}
}

// State management for file tracer.
class Node {
	#children = new Map();
	#parents = new Map();
	isTest = false;

	constructor(path) {
		this.path = path;
	}

	get parents() {
		return this.#parents.keys();
	}

	addChild(node) {
		this.#children.set(node.path, node);
		node.#addParent(this);
	}

	#addParent(node) {
		this.#parents.set(node.path, node);
	}

	prune() {
		for (const child of this.#children.values()) {
			child.#removeParent(this);
		}

		for (const parent of this.#parents.values()) {
			parent.#removeChild(this);
		}
	}

	#removeChild(node) {
		this.#children.delete(node.path);
	}

	#removeParent(node) {
		this.#parents.delete(node.path);
	}
}

class Tree extends Map {
	get(path) {
		if (!this.has(path)) {
			this.set(path, new Node(path));
		}

		return super.get(path);
	}

	delete(path) {
		const node = this.get(path);
		node?.prune();
		super.delete(path);
	}
}

// Track file dependencies to determine which test files to run.
class FileTracer {
	#base;
	#cache = Object.create(null);
	#pendingTrace = null;
	#updateRunning;
	#signalUpdateRunning;
	#tree = new Tree();

	constructor({base}) {
		this.#base = base;
		this.#updateRunning = new Promise(resolve => {
			this.#signalUpdateRunning = resolve;
		});
	}

	get busy() {
		return this.#pendingTrace;
	}

	traceToTestFile(startingPath) {
		const todo = [startingPath];
		const testFiles = new Set();
		const visited = new Set();
		for (const path of todo) {
			if (visited.has(path)) {
				continue;
			}

			visited.add(path);

			const node = this.#tree.get(path);
			if (node === undefined) {
				continue;
			}

			if (node.isTest) {
				testFiles.add(node.path);
			} else {
				todo.push(...node.parents);
			}
		}

		return [...testFiles];
	}

	addDependency(testFile, path) {
		const testNode = this.#tree.get(testFile);
		testNode.isTest = true;

		const node = this.#tree.get(path);
		testNode.addChild(node);
	}

	has(path) {
		return this.#tree.has(path);
	}

	update(changes) {
		const current = this.#update(changes).finally(() => { // eslint-disable-line promise/prefer-await-to-then
			if (this.#pendingTrace === current) {
				this.#pendingTrace = null;
				this.#updateRunning = new Promise(resolve => {
					this.#signalUpdateRunning = resolve;
				});
			}
		});

		this.#pendingTrace = current;
	}

	async #update(changes) {
		await this.#pendingTrace; // Guard against race conditions.
		this.#signalUpdateRunning();

		let reuseCache = true;
		const knownTestFiles = new Set();
		const deletedFiles = new Set();
		const filesToTrace = new Set();
		for (const {path, isTest, exists} of await changes) {
			if (exists) {
				if (isTest) {
					knownTestFiles.add(path);
				}

				filesToTrace.add(path);
			} else {
				deletedFiles.add(path);
			}

			// The cache can be reused as long as the changes are just for new files.
			reuseCache &&= !this.#tree.has(path);
		}

		// Remove deleted files from the tree.
		for (const path of deletedFiles) {
			this.#tree.delete(path);
		}

		// Create a new cache if the old one can't be reused.
		if (!reuseCache) {
			this.#cache = Object.create(null);
		}

		// If all changes are deletions then there is no more work to do.
		if (filesToTrace.size === 0) {
			return;
		}

		// Always retrace all test files, in case a file was deleted and then replaced.
		for (const node of this.#tree.values()) {
			if (node.isTest) {
				filesToTrace.add(node.path);
			}
		}

		// Trace any new and changed files.
		const {fileList, reasons} = await nodeFileTrace([...filesToTrace], {
			analysis: { // Only trace exact imports.
				emitGlobs: false,
				computeFileReferences: false,
				evaluatePureExpressions: true,
			},
			base: this.#base,
			cache: this.#cache,
			conditions: ['node'],
			exportsOnly: true, // Disregard "main" in package files when "exports" is present.
			ignore: ['**/node_modules/**'], // Don't trace through installed dependencies.
		});

		// Update the tree.
		for (const path of fileList) {
			const node = this.#tree.get(path);
			node.isTest = knownTestFiles.has(path);

			const {parents} = reasons.get(path);
			for (const parent of parents) {
				const parentNode = this.#tree.get(parent);
				parentNode.addChild(node);
			}
		}
	}
}
