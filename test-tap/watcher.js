import EventEmitter from 'node:events';
import path from 'node:path';
import {PassThrough} from 'node:stream';

import ignoreByDefault from 'ignore-by-default';
import sinon from 'sinon';
import {test} from 'tap';

import {normalizeGlobs} from '../lib/globs.js';
import timers from '../lib/now-and-timers.cjs';
import Watcher, {_testOnlyReplaceChokidar, _testOnlyReplaceDebug} from '../lib/watcher.js';

const {setImmediate} = timers;
const defaultIgnore = ignoreByDefault.directories();

// Helper to make using beforeEach less arduous
function makeGroup(test) {
	return (desc, fn) => {
		test(desc, t => {
			const beforeEach = fn => {
				t.beforeEach(() => {
					fn();
				});
			};

			const pending = [];
			const test = (name, fn) => {
				pending.push(t.test(name, fn));
			};

			fn(beforeEach, test, makeGroup(test));

			return Promise.all(pending);
		});
	};
}

const group = makeGroup(test);

group('chokidar', (beforeEach, test, group) => {
	let chokidar;
	let debug;
	let reporter;
	let api;
	let Subject;
	let runStatus;
	let resetRunStatus;
	let clock;
	let chokidarEmitter;
	let stdin;
	let files;
	let defaultApiOptions;

	beforeEach(() => {
		chokidar = {
			watch: sinon.stub(),
		};
		_testOnlyReplaceChokidar(chokidar);

		debug = sinon.spy();
		_testOnlyReplaceDebug(name => (...args) => debug(name, ...args));

		reporter = {
			endRun: sinon.spy(),
			lineWriter: {
				writeLine: sinon.spy(),
			},
		};

		api = {
			on() {},
			run: sinon.stub(),
		};

		resetRunStatus = () => {
			runStatus = {
				stats: {
					byFile: new Map(),
					declaredTests: 0,
					failedHooks: 0,
					failedTests: 0,
					failedWorkers: 0,
					files,
					finishedWorkers: 0,
					internalErrors: 0,
					remainingTests: 0,
					passedKnownFailingTests: 0,
					passedTests: 0,
					selectedTests: 0,
					skippedTests: 0,
					timeouts: 0,
					todoTests: 0,
					uncaughtExceptions: 0,
					unhandledRejections: 0,
				},
			};

			return runStatus;
		};

		if (clock) {
			clock.uninstall();
		}

		clock = sinon.useFakeTimers({
			toFake: [
				'setImmediate',
				'setTimeout',
				'clearTimeout',
			],
		});

		chokidarEmitter = new EventEmitter();
		chokidar.watch.returns(chokidarEmitter);

		api.run.returns(new Promise(() => {}));
		files = [
			'test.cjs',
			'test-*.cjs',
			'test/**/*.cjs',
		];
		defaultApiOptions = {
			clearLogOnNextRun: false,
			previousFailures: 0,
			runOnlyExclusive: false,
			runVector: 1,
			updateSnapshots: false,
		};

		resetRunStatus();

		stdin = new PassThrough();
		stdin.pause();

		Subject = Watcher;
	});

	const start = ignoredByWatcher => new Subject({reporter, api, filter: [], globs: normalizeGlobs({files, ignoredByWatcher, extensions: ['cjs'], providers: []}), projectDir: process.cwd(), providers: []});

	const emitChokidar = (event, path) => {
		chokidarEmitter.emit('all', event, path);
	};

	const add = path => {
		emitChokidar('add', path || 'source.cjs');
	};

	const change = path => {
		emitChokidar('change', path || 'source.cjs');
	};

	const unlink = path => {
		emitChokidar('unlink', path || 'source.cjs');
	};

	const delay = () => new Promise(resolve => {
		setImmediate(resolve);
	});

	// Advance the clock to get past the debounce timeout, then wait for a promise
	// to be resolved to get past the `busy.then()` delay
	const debounce = times => {
		times = times >= 0 ? times : 1;
		clock.next();
		return delay().then(() => {
			if (times > 1) {
				return debounce(times - 1);
			}
		});
	};

	test('watches for all file changes, except for the ignored ones', t => {
		t.plan(2);
		start();

		t.ok(chokidar.watch.calledOnce);
		t.strictSame(chokidar.watch.firstCall.args, [
			['**/*'],
			{
				cwd: process.cwd(),
				ignored: [...defaultIgnore.map(dir => `${dir}/**/*`), '**/node_modules/**/*', '**/*.snap.md', 'ava.config.js', 'ava.config.cjs'],
				ignoreInitial: true,
			},
		]);
	});

	test('ignored files are configurable', t => {
		t.plan(2);
		const ignoredByWatcher = ['!foo.cjs', 'bar.cjs', '!baz.cjs', 'qux.cjs'];
		start(ignoredByWatcher);

		t.ok(chokidar.watch.calledOnce);
		t.strictSame(chokidar.watch.firstCall.args, [
			['**/*'],
			{
				cwd: process.cwd(),
				ignored: [...defaultIgnore.map(dir => `${dir}/**/*`), '**/node_modules/**/*', '**/*.snap.md', 'ava.config.js', 'ava.config.cjs', 'bar.cjs', 'qux.cjs'],
				ignoreInitial: true,
			},
		]);
	});

	test('starts running the initial tests', t => {
		t.plan(6);

		let done;
		api.run.returns(new Promise(resolve => {
			done = () => {
				resolve(runStatus);
			};
		}));

		start();
		t.ok(api.run.calledOnce);
		t.strictSame(api.run.firstCall.args, [{files: [], filter: [], runtimeOptions: defaultApiOptions}]);

		// The endRun and lineWriter.writeLine methods are only called after the run promise fulfils
		t.ok(reporter.endRun.notCalled);
		t.ok(reporter.lineWriter.writeLine.notCalled);
		done();
		return delay().then(() => {
			t.ok(reporter.endRun.calledOnce);
			t.ok(reporter.lineWriter.writeLine.calledOnce);
		});
	});

	for (const variant of [
		{
			label: 'is added',
			fire: add,
			event: 'add',
		},
		{
			label: 'changes',
			fire: change,
			event: 'change',
		},
		{
			label: 'is removed',
			fire: unlink,
			event: 'unlink',
		},
	]) {
		test(`logs a debug message when a file is ${variant.label}`, t => {
			t.plan(2);
			start();

			variant.fire('file.cjs');
			t.ok(debug.calledOnce);
			t.strictSame(debug.firstCall.args, ['ava:watcher', 'Detected %s of %s', variant.event, 'file.cjs']);
		});
	}

	for (const variant of [
		{
			label: 'is added',
			fire: add,
		},
		{
			label: 'changes',
			fire: change,
		},
		{
			label: 'is removed',
			fire: unlink,
		},
	]) {
		test(`reruns initial tests when a source file ${variant.label}`, t => {
			t.plan(4);

			api.run.returns(Promise.resolve(runStatus));
			start();

			let done;
			api.run.returns(new Promise(resolve => {
				done = () => {
					resolve(runStatus);
				};
			}));

			variant.fire();
			return debounce().then(() => {
				t.ok(api.run.calledTwice);
				// No explicit files are provided
				t.strictSame(api.run.secondCall.args, [{files: [], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);

				// Finish is only called after the run promise fulfils
				t.ok(reporter.endRun.calledOnce);

				resetRunStatus();
				done();
				return delay();
			}).then(() => {
				t.ok(reporter.endRun.calledTwice);
			});
		});
	}

	for (const variant of [
		{
			label: 'failures',
			prop: 'failedTests',
		},
		{
			label: 'rejections',
			prop: 'unhandledRejections',
		},
		{
			label: 'exceptions',
			prop: 'uncaughtExceptions',
		},
	]) {
		test(`does not clear log if the previous run had ${variant.label}`, t => {
			t.plan(2);

			runStatus.stats[variant.prop] = 1;
			api.run.returns(Promise.resolve(runStatus));
			start();

			api.run.returns(Promise.resolve(resetRunStatus()));
			change();
			return debounce().then(() => {
				t.strictSame(api.run.secondCall.args, [{files: [], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: false,
					runVector: 2,
				}}]);

				change();
				return debounce();
			}).then(() => {
				t.strictSame(api.run.thirdCall.args, [{files: [], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 3,
				}}]);
			});
		});
	}

	test('debounces by 100ms', t => {
		t.plan(1);
		api.run.returns(Promise.resolve(runStatus));
		start();

		change();
		const before = clock.now;
		return debounce().then(() => {
			t.equal(clock.now - before, 100);
		});
	});

	test('debounces again if changes occur in the interval', t => {
		t.plan(4);
		api.run.returns(Promise.resolve(runStatus));
		start();

		change();
		change();

		const before = clock.now;
		return debounce().then(() => {
			change();
			return debounce();
		}).then(() => {
			t.equal(clock.now - before, 150);
			change();
			return debounce();
		}).then(() => {
			t.equal(clock.now - before, 175);
			change();
			return debounce();
		}).then(() => {
			t.equal(clock.now - before, 187);
			change();
			return debounce();
		}).then(() => {
			t.equal(clock.now - before, 197);
		});
	});

	test('only reruns tests once the initial run has finished', t => {
		t.plan(2);

		let done;
		api.run.returns(new Promise(resolve => {
			done = () => {
				resolve(runStatus);
			};
		}));
		start();

		change();
		clock.next();
		return delay().then(() => {
			t.ok(api.run.calledOnce);

			done();
			return delay();
		}).then(() => {
			t.ok(api.run.calledTwice);
		});
	});

	test('only reruns tests once the previous run has finished', t => {
		t.plan(3);
		api.run.returns(Promise.resolve(runStatus));
		start();

		let done;
		api.run.returns(new Promise(resolve => {
			done = () => {
				resolve(runStatus);
			};
		}));

		change();
		return debounce().then(() => {
			t.ok(api.run.calledTwice);

			change();
			clock.next();
			return delay();
		}).then(() => {
			t.ok(api.run.calledTwice);

			done();
			return delay();
		}).then(() => {
			t.ok(api.run.calledThrice);
		});
	});

	for (const variant of [
		{
			label: 'is added',
			fire: add,
		},
		{
			label: 'changes',
			fire: change,
		},
	]) {
		test(`(re)runs a test file when it ${variant.label}`, t => {
			t.plan(4);

			api.run.returns(Promise.resolve(runStatus));
			start();

			let done;
			api.run.returns(new Promise(resolve => {
				done = () => {
					resolve(runStatus);
				};
			}));

			variant.fire('test.cjs');
			return debounce().then(() => {
				t.ok(api.run.calledTwice);
				// The `test.js` file is provided
				t.strictSame(api.run.secondCall.args, [{files: [path.resolve('test.cjs')], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);

				// The endRun method is only called after the run promise fulfills
				t.ok(reporter.endRun.calledOnce);

				resetRunStatus();
				done();
				return delay();
			}).then(() => {
				t.ok(reporter.endRun.calledTwice);
			});
		});
	}

	test('(re)runs several test files when they are added or changed', t => {
		t.plan(2);
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('test-one.cjs');
		change('test-two.cjs');
		return debounce(2).then(() => {
			t.ok(api.run.calledTwice);
			// The test files are provided
			t.strictSame(api.run.secondCall.args, [{files: [path.resolve('test-one.cjs'), path.resolve('test-two.cjs')], filter: [], runtimeOptions: {
				...defaultApiOptions,
				clearLogOnNextRun: true,
				runVector: 2,
			}}]);
		});
	});

	test('reruns initial tests if both source and test files are added or changed', t => {
		t.plan(2);
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('test.cjs');
		unlink('source.cjs');
		return debounce(2).then(() => {
			t.ok(api.run.calledTwice);
			// No explicit files are provided
			t.strictSame(api.run.secondCall.args, [{files: [], filter: [], runtimeOptions: {
				...defaultApiOptions,
				clearLogOnNextRun: true,
				runVector: 2,
			}}]);
		});
	});

	test('does nothing if tests are deleted', t => {
		t.plan(1);
		api.run.returns(Promise.resolve(runStatus));
		start();

		unlink('test.cjs');
		return debounce().then(() => {
			t.ok(api.run.calledOnce);
		});
	});

	test('determines whether changed files are tests based on the initial files patterns', t => {
		t.plan(2);

		files = ['foo-{bar,baz}.cjs'];
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('foo-bar.cjs');
		add('foo-baz.cjs');
		return debounce(2).then(() => {
			t.ok(api.run.calledTwice);
			t.strictSame(api.run.secondCall.args, [{files: [path.resolve('foo-bar.cjs'), path.resolve('foo-baz.cjs')], filter: [], runtimeOptions: {
				...defaultApiOptions,
				clearLogOnNextRun: true,
				runVector: 2,
			}}]);
		});
	});

	test('test files must not start with an underscore', t => {
		t.plan(2);

		api.files = ['_foo.bar'];
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('_foo.bar');
		return debounce(2).then(() => {
			t.ok(api.run.calledTwice);
			// `_foo.bar` cannot be a test file, thus the initial tests are run
			t.strictSame(api.run.secondCall.args, [{files: [], filter: [], runtimeOptions: {
				...defaultApiOptions,
				clearLogOnNextRun: true,
				runVector: 2,
			}}]);
		});
	});

	for (const input of ['r', 'rs']) {
		test(`reruns initial tests when "${input}" is entered on stdin`, t => {
			t.plan(4);
			api.run.returns(Promise.resolve(runStatus));
			start().observeStdin(stdin);

			stdin.write(`${input}\n`);
			return delay().then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [], filter: [], runtimeOptions: {...defaultApiOptions, runVector: 2}}]);

				stdin.write(`\t${input}  \n`);
				return delay();
			}).then(() => {
				t.ok(api.run.calledThrice);
				t.strictSame(api.run.thirdCall.args, [{files: [], filter: [], runtimeOptions: {...defaultApiOptions, runVector: 3}}]);
			});
		});
	}

	test('reruns previous tests and update snapshots when "u" is entered on stdin', async t => {
		const options = {...defaultApiOptions, updateSnapshots: true};
		t.plan(5);
		api.run.returns(Promise.resolve(runStatus));
		start().observeStdin(stdin);

		add('test-one.cjs');
		await debounce();
		t.ok(api.run.calledTwice);

		stdin.write('u\n');
		await delay();

		t.ok(api.run.calledThrice);
		t.strictSame(api.run.thirdCall.args, [{files: [path.resolve('test-one.cjs')], filter: [], runtimeOptions: {...options, runVector: 3}}]);

		stdin.write('\tu  \n');
		await delay();

		t.equal(api.run.callCount, 4);
		t.strictSame(api.run.lastCall.args, [{files: [path.resolve('test-one.cjs')], filter: [], runtimeOptions: {...options, runVector: 4}}]);
	});

	for (const input of ['r', 'rs', 'u']) {
		test(`entering "${input}" on stdin prevents the log from being cleared`, t => {
			t.plan(2);
			api.run.returns(Promise.resolve(runStatus));
			start().observeStdin(stdin);

			stdin.write(`${input}\n`);
			return delay().then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: false,
					runVector: 2,
					updateSnapshots: input === 'u',
				}}]);
			});
		});

		test(`entering "${input}" on stdin cancels any debouncing`, t => {
			t.plan(7);
			api.run.returns(Promise.resolve(runStatus));
			start().observeStdin(stdin);

			let before = clock.now;
			let done;
			api.run.returns(new Promise(resolve => {
				done = () => {
					resolve(runStatus);
				};
			}));

			add();
			stdin.write(`${input}\n`);
			return delay().then(() => {
				// Processing "rs" caused a new run
				t.ok(api.run.calledTwice);

				// Try to advance the clock. This is *after* input was processed. The
				// debounce timeout should have been canceled, so the clock can't have
				// advanced.
				clock.next();
				t.equal(before, clock.now);

				add();
				// Advance clock *before* input is received. Note that the previous run
				// hasn't finished yet.
				clock.next();
				stdin.write(`${input}\n`);

				return delay();
			}).then(() => {
				// No new runs yet
				t.ok(api.run.calledTwice);
				// Though the clock has advanced
				t.equal(clock.now - before, 100);
				before = clock.now;

				const previous = done;
				api.run.returns(new Promise(resolve => {
					done = () => {
						resolve(runStatus);
					};
				}));

				// Finish the previous run
				previous();

				return delay();
			}).then(() => {
				// There's only one new run
				t.ok(api.run.calledThrice);

				stdin.write(`${input}\n`);
				return delay();
			}).then(() => {
				add();

				// Finish the previous run. This should cause a new run due to the
				// input.
				done();

				return delay();
			}).then(() => {
				// Again there's only one new run
				t.equal(api.run.callCount, 4);

				// Try to advance the clock. This is *after* input was processed. The
				// debounce timeout should have been canceled, so the clock can't have
				// advanced.
				clock.next();
				t.equal(before, clock.now);
			});
		});
	}

	test('does nothing if anything other than "rs" is entered on stdin', t => {
		t.plan(1);
		api.run.returns(Promise.resolve(runStatus));
		start().observeStdin(stdin);

		stdin.write('foo\n');
		return debounce().then(() => {
			t.ok(api.run.calledOnce);
		});
	});

	test('ignores unexpected events from chokidar', t => {
		t.plan(1);
		api.run.returns(Promise.resolve(runStatus));
		start();

		emitChokidar('foo', 'foo.cjs');
		return debounce().then(() => {
			t.ok(api.run.calledOnce);
		});
	});

	test('initial run rejects', t => {
		t.plan(1);
		const expected = new Error();
		api.run.returns(Promise.reject(expected));
		start();

		return delay().then(() => {
			// The error is rethrown asynchronously, using setImmediate. The clock has
			// faked setTimeout, so if we call clock.next() it'll invoke and rethrow
			// the error, which can then be caught here.
			try {
				clock.next();
			} catch (error) {
				t.equal(error, expected);
			}
		});
	});

	test('subsequent run rejects', t => {
		t.plan(1);
		api.run.returns(Promise.resolve(runStatus));
		start();

		const expected = new Error();
		api.run.returns(Promise.reject(expected));

		add();
		return debounce().then(() => {
			// The error is rethrown asynchronously, using setImmediate. The clock has
			// faked setTimeout, so if we call clock.next() it'll invoke and rethrow
			// the error, which can then be caught here.
			try {
				clock.next();
			} catch (error) {
				t.equal(error, expected);
			}
		});
	});

	group('tracks test dependencies', (beforeEach, test) => {
		let apiEmitter;
		let runStatus;
		let runStatusEmitter;
		beforeEach(() => {
			apiEmitter = new EventEmitter();
			api.on = (event, fn) => {
				apiEmitter.on(event, fn);
			};

			runStatusEmitter = new EventEmitter();
			runStatus = {
				stats: {
					byFile: new Map(),
					declaredTests: 0,
					failedHooks: 0,
					failedTests: 0,
					failedWorkers: 0,
					files,
					finishedWorkers: 0,
					internalErrors: 0,
					remainingTests: 0,
					passedKnownFailingTests: 0,
					passedTests: 0,
					selectedTests: 0,
					skippedTests: 0,
					timeouts: 0,
					todoTests: 0,
					uncaughtExceptions: 0,
					unhandledRejections: 0,
				},
				on(event, fn) {
					runStatusEmitter.on(event, fn);
				},
			};
		});

		const emitDependencies = (testFile, dependencies) => {
			runStatusEmitter.emit('stateChange', {type: 'dependencies', testFile, dependencies});
		};

		const seed = ignoredByWatcher => {
			let done;
			api.run.returns(new Promise(resolve => {
				done = () => {
					resolve(runStatus);
				};
			}));

			const watcher = start(ignoredByWatcher);
			const files = [path.join('test', '1.cjs'), path.join('test', '2.cjs')];
			const absFiles = files.map(relFile => path.resolve(relFile));
			apiEmitter.emit('run', {
				files: absFiles,
				status: runStatus,
			});
			emitDependencies(path.resolve(files[0]), [path.resolve('dep-1.cjs'), path.resolve('dep-3.cjs')]);
			emitDependencies(path.resolve(files[1]), [path.resolve('dep-2.cjs'), path.resolve('dep-3.cjs')]);

			done();
			api.run.returns(new Promise(() => {}));
			return watcher;
		};

		test('runs specific tests that depend on changed sources', t => {
			t.plan(2);
			seed();

			change('dep-1.cjs');
			return debounce().then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [path.resolve(path.join('test', '1.cjs'))], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('reruns all tests if a source cannot be mapped to a particular test', t => {
			t.plan(2);
			seed();

			change('cannot-be-mapped.cjs');
			return debounce().then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('runs changed tests and tests that depend on changed sources', t => {
			t.plan(2);
			seed();

			change('dep-1.cjs');
			change(path.join('test', '2.cjs'));
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{
					files: [path.resolve(path.join('test', '2.cjs')), path.resolve(path.join('test', '1.cjs'))],
					filter: [],
					runtimeOptions: {
						...defaultApiOptions,
						clearLogOnNextRun: true,
						runVector: 2,
					},
				}]);
			});
		});

		test('avoids duplication when both a test and a source dependency change', t => {
			t.plan(2);
			seed();

			change(path.join('test', '1.cjs'));
			change('dep-1.cjs');
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [path.resolve(path.join('test', '1.cjs'))], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('stops tracking unlinked tests', t => {
			t.plan(2);
			seed();

			unlink(path.join('test', '1.cjs'));
			change('dep-3.cjs');
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [path.resolve(path.join('test', '2.cjs'))], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('updates test dependencies', t => {
			t.plan(2);
			seed();

			emitDependencies(path.resolve(path.join('test', '1.cjs')), [path.resolve('dep-4.cjs')]);
			change('dep-4.cjs');
			return debounce().then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [path.resolve(path.join('test', '1.cjs'))], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		for (const variant of [
			{
				desc: 'does not track ignored dependencies',
				ignoredByWatcher: ['dep-2.cjs'],
			},
			{
				desc: 'exclusion patterns affect tracked source dependencies',
				ignoredByWatcher: ['dep-2.cjs'],
			},
		]) {
			test(variant.desc, t => {
				t.plan(2);
				seed(variant.ignoredByWatcher);

				// `dep-2.js` isn't treated as a source and therefore it's not tracked as
				// a dependency for `test/2.js`. Pretend Chokidar detected a change to
				// verify (normally Chokidar would also be ignoring this file but hey).
				change('dep-2.cjs');
				return debounce().then(() => {
					t.ok(api.run.calledTwice);
					// Expect all tests to be rerun since `dep-2.js` is not a tracked
					// dependency
					t.strictSame(api.run.secondCall.args, [{files: [], filter: [], runtimeOptions: {
						...defaultApiOptions,
						clearLogOnNextRun: true,
						runVector: 2,
					}}]);
				});
			});
		}

		test('uses default ignoredByWatcher patterns', t => {
			t.plan(2);
			seed();

			emitDependencies(path.join('test', '1.cjs'), [path.resolve('package.json'), path.resolve('index.cjs'), path.resolve('lib/util.cjs')]);
			emitDependencies(path.join('test', '2.cjs'), [path.resolve('foo.bar')]);
			change('package.json');
			change('index.cjs');
			change(path.join('lib', 'util.cjs'));

			api.run.returns(Promise.resolve(runStatus));
			return debounce(3).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [path.join('test', '1.cjs')], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('uses default exclusion patterns', t => {
			t.plan(2);

			// Ensure each directory is treated as containing sources
			seed();

			// Synthesize an excluded file for each directory that's ignored by
			// default. Apply deeper nesting for each file.
			const excludedFiles = defaultIgnore.map((dir, index) => {
				let relPath = dir;
				for (let i = index; i >= 0; i--) {
					relPath = path.join(relPath, String(i));
				}

				return `${relPath}.js`;
			});

			// Ensure `test/1.js` also depends on the excluded files
			emitDependencies(
				path.join('test', '1.cjs'),
				[...excludedFiles.map(relPath => path.resolve(relPath)), 'dep-1.cjs'],
			);

			// Modify all excluded files
			for (const x of excludedFiles) {
				change(x);
			}

			return debounce(excludedFiles.length).then(() => {
				t.ok(api.run.calledTwice);
				// Since the excluded files are not tracked as a dependency, all tests
				// are expected to be rerun
				t.strictSame(api.run.secondCall.args, [{files: [], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('logs a debug message when a dependent test is found', t => {
			t.plan(2);
			seed();

			change('dep-1.cjs');
			return debounce().then(() => {
				t.ok(debug.calledTwice);
				t.strictSame(debug.secondCall.args, ['ava:watcher', '%s is a dependency of %s', path.resolve('dep-1.cjs'), path.resolve(path.join('test', '1.cjs'))]);
			});
		});

		test('logs a debug message when sources remain without dependent tests', t => {
			t.plan(3);
			seed();

			change('cannot-be-mapped.cjs');
			return debounce().then(() => {
				t.ok(debug.calledThrice);
				t.strictSame(debug.secondCall.args, ['ava:watcher', 'Files remain that cannot be traced to specific tests: %O', [path.resolve('cannot-be-mapped.cjs')]]);
				t.strictSame(debug.thirdCall.args, ['ava:watcher', 'Rerunning all tests']);
			});
		});
	});

	group('failure counts are correctly reset', (beforeEach, test) => {
		let apiEmitter;
		let runStatus;
		let runStatusEmitter;
		beforeEach(() => {
			apiEmitter = new EventEmitter();
			api.on = (event, fn) => {
				apiEmitter.on(event, fn);
			};

			runStatusEmitter = new EventEmitter();
			runStatus = {
				stats: {
					byFile: new Map(),
					declaredTests: 0,
					failedHooks: 0,
					failedTests: 0,
					failedWorkers: 0,
					files,
					finishedWorkers: 0,
					internalErrors: 0,
					remainingTests: 0,
					passedKnownFailingTests: 0,
					passedTests: 0,
					selectedTests: 0,
					skippedTests: 0,
					timeouts: 0,
					todoTests: 0,
					uncaughtExceptions: 0,
					unhandledRejections: 0,
				},
				on(event, fn) {
					runStatusEmitter.on(event, fn);
				},
			};
		});

		const t1 = path.join('test', '1.cjs');
		const t1Absolute = path.resolve(t1);

		const seed = () => {
			let done;
			api.run.returns(new Promise(resolve => {
				done = () => {
					resolve(runStatus);
				};
			}));

			const watcher = start();
			apiEmitter.emit('run', {
				files: [t1Absolute],
				status: runStatus,
			});

			runStatusEmitter.emit('stateChange', {
				type: 'test-failed',
				testFile: t1Absolute,
			});

			done();
			api.run.returns(new Promise(() => {}));
			return watcher;
		};

		test('when failed test is changed', t => {
			const options = {...defaultApiOptions};
			t.plan(2);
			seed();

			change(t1);
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [t1Absolute], filter: [], runtimeOptions: {
					...options,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});
	});

	group('.only is sticky', (beforeEach, test) => {
		let apiEmitter;
		let runStatus;
		let runStatusEmitter;
		beforeEach(() => {
			apiEmitter = new EventEmitter();
			api.on = (event, fn) => {
				apiEmitter.on(event, fn);
			};

			runStatusEmitter = new EventEmitter();
			runStatus = {
				stats: {
					byFile: new Map(),
					declaredTests: 0,
					failedHooks: 0,
					failedTests: 0,
					failedWorkers: 0,
					files,
					finishedWorkers: 0,
					internalErrors: 0,
					remainingTests: 0,
					passedKnownFailingTests: 0,
					passedTests: 0,
					selectedTests: 0,
					skippedTests: 0,
					timeouts: 0,
					todoTests: 0,
					uncaughtExceptions: 0,
					unhandledRejections: 0,
				},
				on(event, fn) {
					runStatusEmitter.on(event, fn);
				},
			};
		});

		const emitStats = (testFile, hasExclusive) => {
			runStatus.stats.byFile.set(testFile, {
				declaredTests: 2,
				failedHooks: 0,
				failedTests: 0,
				internalErrors: 0,
				remainingTests: 0,
				passedKnownFailingTests: 0,
				passedTests: 0,
				selectedTests: hasExclusive ? 1 : 2,
				skippedTests: 0,
				todoTests: 0,
				uncaughtExceptions: 0,
				unhandledRejections: 0,
			});
			runStatusEmitter.emit('stateChange', {type: 'worker-finished', testFile});
		};

		const t1 = path.join('test', '1.cjs');
		const t2 = path.join('test', '2.cjs');
		const t3 = path.join('test', '3.cjs');
		const t4 = path.join('test', '4.cjs');
		const t1Absolute = path.resolve(t1);
		const t2Absolute = path.resolve(t2);
		const t3Absolute = path.resolve(t3);
		const t4Absolute = path.resolve(t4);

		const seed = () => {
			let done;
			api.run.returns(new Promise(resolve => {
				done = () => {
					resolve(runStatus);
				};
			}));

			const watcher = start();
			apiEmitter.emit('run', {
				files: [t1Absolute, t2Absolute, t3Absolute, t4Absolute],
				status: runStatus,
			});
			emitStats(t1Absolute, true);
			emitStats(t2Absolute, true);
			emitStats(t3Absolute, false);
			emitStats(t4Absolute, false);

			done();
			api.run.returns(new Promise(() => {}));
			return watcher;
		};

		test('changed test files (none of which previously contained .only) are run in exclusive mode', t => {
			const options = {...defaultApiOptions, runOnlyExclusive: true};
			t.plan(2);
			seed();

			change(t3);
			change(t4);
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [t1Absolute, t2Absolute, t3Absolute, t4Absolute], filter: [], runtimeOptions: {
					...options,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('changed test files (comprising some, but not all, files that previously contained .only) are run in exclusive mode', t => {
			const options = {...defaultApiOptions, runOnlyExclusive: true};
			t.plan(2);
			seed();

			change(t1);
			change(t4);
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [t1Absolute, t2Absolute, t4Absolute], filter: [], runtimeOptions: {
					...options,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('changed test files (comprising all files that previously contained .only) are run in regular mode', t => {
			t.plan(2);
			seed();

			change(t1);
			change(t2);
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [t1Absolute, t2Absolute], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('once no test files contain .only, further changed test files are run in regular mode', t => {
			t.plan(2);
			seed();

			emitStats(t1Absolute, false);
			emitStats(t2Absolute, false);

			change(t3);
			change(t4);
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [t3Absolute, t4Absolute], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('once test files containing .only are removed, further changed test files are run in regular mode', t => {
			t.plan(2);
			seed();

			unlink(t1);
			unlink(t2);
			change(t3);
			change(t4);
			return debounce(4).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [t3Absolute, t4Absolute], filter: [], runtimeOptions: {
					...defaultApiOptions,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});
	});

	group('tracks previous failures', (beforeEach, test) => {
		let apiEmitter;
		let runStatus;
		let runStatusEmitter;
		beforeEach(() => {
			apiEmitter = new EventEmitter();
			api.on = (event, fn) => {
				apiEmitter.on(event, fn);
			};

			runStatusEmitter = new EventEmitter();
			runStatus = {
				stats: {
					byFile: new Map(),
					declaredTests: 0,
					failedHooks: 0,
					failedTests: 0,
					failedWorkers: 0,
					files,
					finishedWorkers: 0,
					internalErrors: 0,
					remainingTests: 0,
					passedKnownFailingTests: 0,
					passedTests: 0,
					selectedTests: 0,
					skippedTests: 0,
					timeouts: 0,
					todoTests: 0,
					uncaughtExceptions: 0,
					unhandledRejections: 0,
				},
				on(event, fn) {
					runStatusEmitter.on(event, fn);
				},
			};
		});

		const seed = seedFailures => {
			let done;
			api.run.returns(new Promise(resolve => {
				done = () => {
					resolve(runStatus);
				};
			}));

			const watcher = start();
			const files = [path.join('test', '1.cjs'), path.join('test', '2.cjs')];
			const filesAbsolute = [path.join('test', '1.cjs'), path.join('test', '2.cjs')].map(file => path.resolve(file));
			apiEmitter.emit('run', {
				files,
				status: runStatus,
			});

			if (seedFailures) {
				seedFailures(files, filesAbsolute);
			}

			done();
			api.run.returns(new Promise(() => {}));
			return watcher;
		};

		const rerun = function (file, fileAbsolute) {
			runStatus = {on: runStatus.on};
			let done;
			api.run.returns(new Promise(resolve => {
				done = () => {
					resolve(runStatus);
				};
			}));

			change(file);
			return debounce().then(() => {
				apiEmitter.emit('run', {
					files: [fileAbsolute],
					status: runStatus,
				});
				done();

				api.run.returns(new Promise(() => {}));
			});
		};

		test('runs with previousFailures set to number of prevous failures', t => {
			t.plan(2);

			let other;
			seed((files, filesAbsolute) => {
				runStatusEmitter.emit('stateChange', {
					type: 'test-failed',
					testFile: filesAbsolute[0],
				});

				runStatusEmitter.emit('stateChange', {
					type: 'uncaught-exception',
					testFile: filesAbsolute[0],
				});

				other = files[1];
			});

			return rerun(other, path.resolve(other)).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [path.resolve(other)], filter: [], runtimeOptions: {
					...defaultApiOptions,
					previousFailures: 2,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('tracks failures from multiple files', t => {
			t.plan(2);

			let first;

			seed((files, filesAbsolute) => {
				runStatusEmitter.emit('stateChange', {
					type: 'test-failed',
					testFile: filesAbsolute[0],
				});

				runStatusEmitter.emit('stateChange', {
					type: 'test-failed',
					testFile: filesAbsolute[1],
				});

				first = files[0];
			});

			return rerun(first, path.resolve(first)).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [path.resolve(first)], filter: [], runtimeOptions: {
					...defaultApiOptions,
					previousFailures: 1,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('previous failures don’t count when that file is rerun', t => {
			t.plan(2);

			let same;

			seed((files, filesAbsolute) => {
				runStatusEmitter.emit('stateChange', {
					type: 'test-failed',
					testFile: filesAbsolute[0],
				});

				runStatusEmitter.emit('stateChange', {
					type: 'uncaught-exception',
					testFile: filesAbsolute[0],
				});

				same = files[0];
			});

			return rerun(same, path.resolve(same)).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [path.resolve(same)], filter: [], runtimeOptions: {
					...defaultApiOptions,
					previousFailures: 0,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});

		test('previous failures don’t count when that file is deleted', t => {
			t.plan(2);

			let same;
			let other;

			seed((files, filesAbsolute) => {
				runStatusEmitter.emit('stateChange', {
					type: 'test-failed',
					testFile: filesAbsolute[0],
				});

				runStatusEmitter.emit('stateChange', {
					type: 'uncaught-exception',
					testFile: filesAbsolute[0],
				});

				same = files[0];
				other = files[1];
			});

			unlink(same);

			return debounce().then(() => rerun(other, path.resolve(other))).then(() => {
				t.ok(api.run.calledTwice);
				t.strictSame(api.run.secondCall.args, [{files: [path.resolve(other)], filter: [], runtimeOptions: {
					...defaultApiOptions,
					previousFailures: 0,
					clearLogOnNextRun: true,
					runVector: 2,
				}}]);
			});
		});
	});
});
