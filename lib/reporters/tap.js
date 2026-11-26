import os from 'node:os';
import path from 'node:path';
import {stripVTControlCharacters} from 'node:util';

import indentString from 'indent-string';
import plur from 'plur';
import * as supertap from 'supertap';

import serializeError from '../serialize-error.js';

function dumpError({
	assertion,
	formattedDetails,
	formattedError,
	name,
	originalError, // A structured clone, so some details are missing.
	stack,
	source,
	type,
}, sanitizeStackOutput) {
	if (type === 'unknown') {
		return {
			message: 'Non-native error',
			formatted: stripVTControlCharacters(formattedError),
		};
	}

	if (originalError && Object.getOwnPropertyDescriptor(originalError, 'name')?.writable !== false) {
		try {
			originalError.name = name; // Restore the original name.
		} catch {
			// Ignore
		}
	}

	if (type === 'ava') {
		if (assertion) {
			originalError.assertion = assertion;
		}

		if (formattedDetails.length > 0) {
			originalError.details = Object.fromEntries(formattedDetails.map(({label, formatted}) => [
				stripVTControlCharacters(label),
				stripVTControlCharacters(formatted),
			]));
		}
	}

	const errorStack = stack || originalError.stack;
	if (errorStack === '') {
		// Supertap cannot serialize native errors without a stack frame.
		const {stack: omittedStack, ...details} = originalError;
		return {...details, name, message: originalError.message};
	}

	// Supertap uses only the first frame. Prefer the test source found during
	// serialization for AVA assertions; retain the stack for other errors.
	const tapStack = type === 'ava' && source
		? `${errorStack.split('\n', 1)[0]}\n    at ${source.file}:${source.line}`
		: errorStack;
	originalError.stack = sanitizeStackOutput?.(tapStack) ?? tapStack;

	return originalError;
}

export default class TapReporter {
	#crashCount = 0;
	#filesWithMissingAvaImports = new Set();
	#index = 0;
	#prefixTitle;
	#relativeFile;
	#sanitizeStackOutput;
	#separator;
	#stderr;
	#stdout;

	constructor({projectDir, sanitizeStackOutput, separator, stderr, stdout}) {
		this.#relativeFile = file => path.relative(projectDir, file);
		// eslint-disable-next-line no-warning-comments
		// TODO: Remove this test-only hook when the reporter moves to its own package.
		this.#sanitizeStackOutput = sanitizeStackOutput;
		this.#separator = separator;
		this.#stderr = stderr;
		this.#stdout = stdout;
	}

	#writeTimeout(evt) {
		const error = new Error(`Exited because no new tests completed within the last ${evt.period}ms of inactivity`);
		error.stack = ''; // eslint-disable-line unicorn/no-error-property-assignment

		for (const [testFile, tests] of evt.pendingTests) {
			for (const title of tests) {
				this.#writeTest({testFile, title, err: serializeError(error)}, {passed: false, todo: false, skip: false});
			}
		}
	}

	#writeTest(evt, flags) {
		this.#stdout.write(supertap.test(this.#prefixTitle(evt.testFile, evt.title), {
			comment: evt.logs?.map(log => stripVTControlCharacters(log)),
			error: evt.err ? dumpError(evt.err, this.#sanitizeStackOutput) : null,
			index: ++this.#index,
			passed: flags.passed,
			skip: flags.skip,
			todo: flags.todo,
		}) + os.EOL);
	}

	#writeCrash(evt, title) {
		this.#crashCount++;
		this.#stdout.write(supertap.test(title ?? evt.err?.stack?.split('\n', 1)[0].trim() ?? evt.err?.message ?? evt.type, {
			comment: evt.logs?.map(log => stripVTControlCharacters(log)),
			error: evt.err ? dumpError(evt.err, this.#sanitizeStackOutput) : null,
			index: ++this.#index,
			passed: false,
			skip: false,
			todo: false,
		}) + os.EOL);
	}

	#writeComment(evt, {title = this.#prefixTitle(evt.testFile, evt.title)}) {
		this.#stdout.write(`# ${stripVTControlCharacters(title)}${os.EOL}`);
		if (evt.logs) {
			for (const log of evt.logs) {
				const logLines = indentString(stripVTControlCharacters(log), 4).replaceAll(/^ {4}/gm, '#   ');
				this.#stdout.write(`${logLines}${os.EOL}`);
			}
		}
	}

	#writeProcessExit(evt) {
		const error = new Error(`Exiting due to process.exit() when running ${this.#relativeFile(evt.testFile)}`);
		error.stack = evt.stack; // eslint-disable-line unicorn/no-error-property-assignment

		for (const [testFile, tests] of evt.pendingTests) {
			for (const title of tests) {
				this.#writeTest({testFile, title, err: serializeError(error)}, {passed: false, todo: false, skip: false});
			}
		}
	}

	startRun(plan) {
		this.#prefixTitle = (testFile, title) => [...plan.titlePrefixes.get(testFile) ?? [], title].join(this.#separator);

		this.#stdout.write(supertap.start() + os.EOL);
	}

	endRun(totals) {
		this.#stdout.write(supertap.finish({
			crashed: this.#crashCount,
			failed: totals.failedTests + totals.remainingTests,
			passed: totals.passedTests + totals.passedKnownFailingTests,
			skipped: totals.skippedTests,
			todo: totals.todoTests,
		}) + os.EOL);

		if (!totals.parallelRuns) {
			return;
		}

		const {currentFileCount, currentIndex, totalRuns} = totals.parallelRuns;
		this.#stdout.write(`# Ran ${currentFileCount} test ${plur('file', currentFileCount)} out of ${totals.files} for job ${currentIndex + 1} of ${totalRuns}` + os.EOL + os.EOL);
	}

	consumeEvent(evt) { // eslint-disable-line complexity
		switch (evt.type) {
			case 'lifecycle-function-failed': {
				const phase = evt.failurePhase === 'post-test' ? 'after a test' : 'after the test file';
				const title = evt.failurePhase ? `${evt.title} (postcondition failure ${phase})` : evt.title;
				this.#writeTest({...evt, title}, {passed: false, todo: false, skip: false});
				break;
			}

			case 'lifecycle-function-finished': {
				this.#writeComment(evt, {});
				break;
			}

			case 'internal-error': {
				this.#writeCrash(evt);
				break;
			}

			case 'missing-ava-import': {
				this.#filesWithMissingAvaImports.add(evt.testFile);
				this.#writeCrash(evt, `No tests found in ${this.#relativeFile(evt.testFile)}, make sure to import "ava" at the top of your test file`);
				break;
			}

			case 'process-exit': {
				this.#writeProcessExit(evt);
				break;
			}

			case 'selected-test': {
				if (evt.skip) {
					this.#writeTest(evt, {passed: true, todo: false, skip: true});
				} else if (evt.todo) {
					this.#writeTest(evt, {passed: false, todo: true, skip: false});
				}

				break;
			}

			case 'test-failed': {
				this.#writeTest(evt, {passed: false, todo: false, skip: false});
				break;
			}

			case 'test-passed': {
				this.#writeTest(evt, {passed: true, todo: false, skip: false});
				break;
			}

			case 'timeout': {
				this.#writeTimeout(evt);
				break;
			}

			case 'uncaught-exception': {
				this.#writeCrash(evt);
				break;
			}

			case 'unhandled-rejection': {
				this.#writeCrash(evt);
				break;
			}

			case 'worker-failed': {
				if (!this.#filesWithMissingAvaImports.has(evt.testFile)) {
					if (evt.nonZeroExitCode) {
						this.#writeCrash(evt, `${this.#relativeFile(evt.testFile)} exited with a non-zero exit code: ${evt.nonZeroExitCode}`);
					} else {
						this.#writeCrash(evt, `${this.#relativeFile(evt.testFile)} exited due to ${evt.signal}`);
					}
				}

				break;
			}

			case 'worker-finished': {
				if (!evt.forcedExit && !this.#filesWithMissingAvaImports.has(evt.testFile)) {
					if (evt.declaredTests === 0) {
						this.#writeCrash(evt, `No tests found in ${this.#relativeFile(evt.testFile)}`);
					} else if (!evt.failFast && evt.remainingTests > 0) {
						this.#writeComment(evt, {title: `${evt.remainingTests} ${plur('test', evt.remainingTests)} remaining in ${this.#relativeFile(evt.testFile)}`});
					}
				}

				break;
			}

			case 'worker-stderr':
			case 'worker-stdout': {
				this.#stderr.write(evt.chunk);
				break;
			}

			default: {
				break;
			}
		}
	}
}
