import nodePath from 'node:path';

import chokidar_ from 'chokidar';
import createDebug from 'debug';

import {chalk} from './chalk.js';
import {applyTestFileFilter, classify, getChokidarIgnorePatterns} from './globs.js';

let chokidar = chokidar_;
export function _testOnlyReplaceChokidar(replacement) {
	chokidar = replacement;
}

let debug = createDebug('ava:watcher');
export function _testOnlyReplaceDebug(replacement) {
	debug = replacement('ava:watcher');
}

function rethrowAsync(error) {
	// Don't swallow exceptions. Note that any
	// expected error should already have been logged
	setImmediate(() => {
		throw error;
	});
}

const MIN_DEBOUNCE_DELAY = 10;
const INITIAL_DEBOUNCE_DELAY = 100;
const END_MESSAGE = chalk.gray('Type `r` and press enter to rerun tests\nType `u` and press enter to update snapshots\n');

class Debouncer {
	constructor(watcher) {
		this.watcher = watcher;
		this.timer = null;
		this.repeat = false;
	}

	debounce(delay) {
		if (this.timer) {
			this.again = true;
			return;
		}

		delay = delay ? Math.max(delay, MIN_DEBOUNCE_DELAY) : INITIAL_DEBOUNCE_DELAY;

		const timer = setTimeout(async () => {
			await this.watcher.busy;
			// Do nothing if debouncing was canceled while waiting for the busy
			// promise to fulfil
			if (this.timer !== timer) {
				return;
			}

			if (this.again) {
				this.timer = null;
				this.again = false;
				this.debounce(delay / 2);
			} else {
				this.watcher.runAfterChanges();
				this.timer = null;
				this.again = false;
			}
		}, delay);

		this.timer = timer;
	}

	cancel() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
			this.again = false;
		}
	}
}

class TestDependency {
	constructor(file, dependencies) {
		this.file = file;
		this.dependencies = dependencies;
	}

	contains(dependency) {
		return this.dependencies.includes(dependency);
	}
}

export default class Watcher {
	constructor({api, filter = [], globs, projectDir, providers, reporter}) {
		this.debouncer = new Debouncer(this);

		this.clearLogOnNextRun = true;
		this.runVector = 0;
		this.previousFiles = [];
		this.globs = {cwd: projectDir, ...globs};

		const patternFilters = filter.map(({pattern}) => pattern);

		this.providers = providers;
		this.run = (specificFiles = [], updateSnapshots = false) => {
			const clearLogOnNextRun = this.clearLogOnNextRun && this.runVector > 0;
			if (this.runVector > 0) {
				this.clearLogOnNextRun = true;
			}

			this.runVector++;

			let runOnlyExclusive = false;
			if (specificFiles.length > 0) {
				const exclusiveFiles = specificFiles.filter(file => this.filesWithExclusiveTests.includes(file));
				runOnlyExclusive = exclusiveFiles.length !== this.filesWithExclusiveTests.length;
				if (runOnlyExclusive) {
					// The test files that previously contained exclusive tests are always
					// run, together with the remaining specific files.
					const remainingFiles = specificFiles.filter(file => !exclusiveFiles.includes(file));
					specificFiles = [...this.filesWithExclusiveTests, ...remainingFiles];
				}

				if (filter.length > 0) {
					specificFiles = applyTestFileFilter({
						cwd: projectDir,
						expandDirectories: false,
						filter: patternFilters,
						testFiles: specificFiles,
						treatFilterPatternsAsFiles: false,
					});
				}

				this.pruneFailures(specificFiles);
			}

			this.touchedFiles.clear();
			this.previousFiles = specificFiles;
			this.busy = api.run({
				files: specificFiles,
				filter,
				runtimeOptions: {
					clearLogOnNextRun,
					previousFailures: this.sumPreviousFailures(this.runVector),
					runOnlyExclusive,
					runVector: this.runVector,
					updateSnapshots: updateSnapshots === true,
				},
			})
				.then(runStatus => {
					reporter.endRun();
					reporter.lineWriter.writeLine(END_MESSAGE);

					if (this.clearLogOnNextRun && (
						runStatus.stats.failedHooks > 0
						|| runStatus.stats.failedTests > 0
						|| runStatus.stats.failedWorkers > 0
						|| runStatus.stats.internalErrors > 0
						|| runStatus.stats.timeouts > 0
						|| runStatus.stats.uncaughtExceptions > 0
						|| runStatus.stats.unhandledRejections > 0
					)) {
						this.clearLogOnNextRun = false;
					}
				})
				.catch(rethrowAsync);
		};

		this.testDependencies = [];
		this.trackTestDependencies(api);

		this.temporaryFiles = new Set();
		this.touchedFiles = new Set();
		this.trackTouchedFiles(api);

		this.filesWithExclusiveTests = [];
		this.trackExclusivity(api);

		this.filesWithFailures = [];
		this.trackFailures(api);

		this.dirtyStates = {};
		this.watchFiles();
		this.rerunAll();
	}

	watchFiles() {
		chokidar.watch(['**/*'], {
			cwd: this.globs.cwd,
			ignored: getChokidarIgnorePatterns(this.globs),
			ignoreInitial: true,
		}).on('all', (event, path) => {
			if (event === 'add' || event === 'change' || event === 'unlink') {
				debug('Detected %s of %s', event, path);
				this.dirtyStates[nodePath.join(this.globs.cwd, path)] = event;
				this.debouncer.debounce();
			}
		});
	}

	trackTestDependencies(api) {
		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type !== 'dependencies') {
					return;
				}

				const dependencies = evt.dependencies.filter(filePath => {
					const {isIgnoredByWatcher} = classify(filePath, this.globs);
					return !isIgnoredByWatcher;
				});
				this.updateTestDependencies(evt.testFile, dependencies);
			});
		});
	}

	updateTestDependencies(file, dependencies) {
		// Ensure the rewritten test file path is included in the dependencies,
		// since changes to non-rewritten paths are ignored.
		for (const {main} of this.providers) {
			const rewritten = main.resolveTestFile(file);
			if (!dependencies.includes(rewritten)) {
				dependencies = [rewritten, ...dependencies];
			}
		}

		if (dependencies.length === 0) {
			this.testDependencies = this.testDependencies.filter(dep => dep.file !== file);
			return;
		}

		const isUpdate = this.testDependencies.some(dep => {
			if (dep.file !== file) {
				return false;
			}

			dep.dependencies = dependencies;

			return true;
		});

		if (!isUpdate) {
			this.testDependencies.push(new TestDependency(file, dependencies));
		}
	}

	trackTouchedFiles(api) {
		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type !== 'touched-files') {
					return;
				}

				for (const file of evt.files.changedFiles) {
					this.touchedFiles.add(file);
				}

				for (const file of evt.files.temporaryFiles) {
					this.temporaryFiles.add(file);
				}
			});
		});
	}

	trackExclusivity(api) {
		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type !== 'worker-finished') {
					return;
				}

				const fileStats = plan.status.stats.byFile.get(evt.testFile);
				const ranExclusiveTests = fileStats.selectedTests > 0 && fileStats.declaredTests > fileStats.selectedTests;
				this.updateExclusivity(evt.testFile, ranExclusiveTests);
			});
		});
	}

	updateExclusivity(file, hasExclusiveTests) {
		const index = this.filesWithExclusiveTests.indexOf(file);

		if (hasExclusiveTests && index === -1) {
			this.filesWithExclusiveTests.push(file);
		} else if (!hasExclusiveTests && index !== -1) {
			this.filesWithExclusiveTests.splice(index, 1);
		}
	}

	trackFailures(api) {
		api.on('run', plan => {
			this.pruneFailures(plan.files);

			const currentVector = this.runVector;
			plan.status.on('stateChange', evt => {
				if (!evt.testFile) {
					return;
				}

				switch (evt.type) {
					case 'hook-failed':
					case 'internal-error':
					case 'process-exit':
					case 'test-failed':
					case 'uncaught-exception':
					case 'unhandled-rejection':
					case 'worker-failed':
						this.countFailure(evt.testFile, currentVector);
						break;
					default:
						break;
				}
			});
		});
	}

	pruneFailures(files) {
		const toPrune = new Set(files);
		this.filesWithFailures = this.filesWithFailures.filter(state => !toPrune.has(state.file));
	}

	countFailure(file, vector) {
		const isUpdate = this.filesWithFailures.some(state => {
			if (state.file !== file) {
				return false;
			}

			state.count++;
			return true;
		});

		if (!isUpdate) {
			this.filesWithFailures.push({
				file,
				vector,
				count: 1,
			});
		}
	}

	sumPreviousFailures(beforeVector) {
		let total = 0;

		for (const state of this.filesWithFailures) {
			if (state.vector < beforeVector) {
				total += state.count;
			}
		}

		return total;
	}

	cleanUnlinkedTests(unlinkedTests) {
		for (const testFile of unlinkedTests) {
			this.updateTestDependencies(testFile, []);
			this.updateExclusivity(testFile, false);
			this.pruneFailures([testFile]);
		}
	}

	observeStdin(stdin) {
		stdin.resume();
		stdin.setEncoding('utf8');

		stdin.on('data', async data => {
			data = data.trim().toLowerCase();
			if (data !== 'r' && data !== 'rs' && data !== 'u') {
				return;
			}

			// Cancel the debouncer, it might rerun specific tests whereas *all* tests
			// need to be rerun
			this.debouncer.cancel();
			await this.busy;
			// Cancel the debouncer again, it might have restarted while waiting for
			// the busy promise to fulfil
			this.debouncer.cancel();
			this.clearLogOnNextRun = false;
			if (data === 'u') {
				this.updatePreviousSnapshots();
			} else {
				this.rerunAll();
			}
		});
	}

	rerunAll() {
		this.dirtyStates = {};
		this.run();
	}

	updatePreviousSnapshots() {
		this.dirtyStates = {};
		this.run(this.previousFiles, true);
	}

	runAfterChanges() {
		const {dirtyStates} = this;
		this.dirtyStates = {};

		let dirtyPaths = Object.keys(dirtyStates).filter(path => {
			if (this.touchedFiles.has(path)) {
				debug('Ignoring known touched file %s', path);
				this.touchedFiles.delete(path);
				return false;
			}

			// Unlike touched files, temporary files are never cleared. We may see
			// adds and unlinks detected separately, so we track the temporary files
			// as long as AVA is running.
			if (this.temporaryFiles.has(path)) {
				debug('Ignoring known temporary file %s', path);
				return false;
			}

			return true;
		});

		for (const {main} of this.providers) {
			dirtyPaths = dirtyPaths.filter(path => {
				if (main.ignoreChange(path)) {
					debug('Ignoring changed file %s', path);
					return false;
				}

				return true;
			});
		}

		const dirtyHelpersAndSources = [];
		const addedOrChangedTests = [];
		const unlinkedTests = [];
		for (const filePath of dirtyPaths) {
			const {isIgnoredByWatcher, isTest} = classify(filePath, this.globs);
			if (!isIgnoredByWatcher) {
				if (isTest) {
					if (dirtyStates[filePath] === 'unlink') {
						unlinkedTests.push(filePath);
					} else {
						addedOrChangedTests.push(filePath);
					}
				} else {
					dirtyHelpersAndSources.push(filePath);
				}
			}
		}

		this.cleanUnlinkedTests(unlinkedTests);

		// No need to rerun tests if the only change is that tests were deleted
		if (unlinkedTests.length === dirtyPaths.length) {
			return;
		}

		if (dirtyHelpersAndSources.length === 0) {
			// Run any new or changed tests
			this.run(addedOrChangedTests);
			return;
		}

		// Try to find tests that depend on the changed source files
		const testsByHelpersOrSource = dirtyHelpersAndSources.map(path => this.testDependencies.filter(dep => dep.contains(path)).map(dep => {
			debug('%s is a dependency of %s', path, dep.file);
			return dep.file;
		})).filter(tests => tests.length > 0);

		// Rerun all tests if source files were changed that could not be traced to
		// specific tests
		if (testsByHelpersOrSource.length !== dirtyHelpersAndSources.length) {
			debug('Files remain that cannot be traced to specific tests: %O', dirtyHelpersAndSources);
			debug('Rerunning all tests');
			this.run();
			return;
		}

		// Run all affected tests
		this.run([...new Set([addedOrChangedTests, testsByHelpersOrSource].flat(2))]);
	}
}
