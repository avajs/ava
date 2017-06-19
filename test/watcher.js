/* eslint-disable promise/no-callback-in-promise */
'use strict';
const path = require('path');
const EventEmitter = require('events');
const PassThrough = require('stream').PassThrough;
const defaultIgnore = require('ignore-by-default').directories();
const lolex = require('lolex');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tap').test;
const AvaFiles = require('../lib/ava-files');

const setImmediate = require('../lib/globals').setImmediate;

// Helper to make using beforeEach less arduous
function makeGroup(test) {
	return (desc, fn) => {
		test(desc, t => {
			const beforeEach = fn => {
				t.beforeEach(done => {
					fn();
					done();
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
	let logger;
	let api;
	let avaFiles;
	let Subject;
	let runStatus;
	let resetRunStatus;
	let clock;
	let chokidarEmitter;
	let stdin;
	let files;

	function proxyWatcher(opts) {
		return proxyquire.noCallThru().load('../lib/watcher', opts ||
			{
				chokidar,
				debug(name) {
					return function () {
						const args = [name];
						args.push.apply(args, arguments);
						debug.apply(null, args);
					};
				},
				'./ava-files': avaFiles
			});
	}

	beforeEach(() => {
		chokidar = {
			watch: sinon.stub()
		};

		debug = sinon.spy();

		logger = {
			start: sinon.spy(),
			finish: sinon.spy(),
			section: sinon.spy(),
			clear: sinon.stub().returns(true),
			reset: sinon.spy()
		};

		api = {
			on() {},
			run: sinon.stub()
		};

		resetRunStatus = () => {
			runStatus = {
				failCount: 0,
				rejectionCount: 0,
				exceptionCount: 0
			};

			return runStatus;
		};

		if (clock) {
			clock.uninstall();
		}

		clock = lolex.install(0, ['setImmediate', 'setTimeout', 'clearTimeout']);

		chokidarEmitter = new EventEmitter();
		chokidar.watch.returns(chokidarEmitter);

		logger.clear.returns(true);

		avaFiles = AvaFiles;

		api.run.returns(new Promise(() => {}));
		files = [
			'test.js',
			'test-*.js',
			'test'
		];

		resetRunStatus();

		stdin = new PassThrough();
		stdin.pause();

		Subject = proxyWatcher();
	});

	const start = sources => new Subject(logger, api, files, sources || []);

	const emitChokidar = (event, path) => {
		chokidarEmitter.emit('all', event, path);
	};

	const add = path => {
		emitChokidar('add', path || 'source.js');
	};
	const change = path => {
		emitChokidar('change', path || 'source.js');
	};
	const unlink = path => {
		emitChokidar('unlink', path || 'source.js');
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

	test('watches for default source file changes, as well as test files', t => {
		t.plan(2);
		start();

		t.ok(chokidar.watch.calledOnce);
		t.strictDeepEqual(chokidar.watch.firstCall.args, [
			['package.json', '**/*.js'].concat(files),
			{
				ignored: defaultIgnore.map(dir => `${dir}/**/*`),
				ignoreInitial: true
			}
		]);
	});

	test('watched source files are configurable', t => {
		t.plan(2);
		start(['foo.js', '!bar.js', 'baz.js', '!qux.js']);

		t.ok(chokidar.watch.calledOnce);
		t.strictDeepEqual(chokidar.watch.firstCall.args, [
			['foo.js', 'baz.js'].concat(files),
			{
				ignored: defaultIgnore.map(dir => `${dir}/**/*`).concat('bar.js', 'qux.js'),
				ignoreInitial: true
			}
		]);
	});

	test('configured sources can override default ignore patterns', t => {
		t.plan(2);
		start(['node_modules/foo/*.js']);

		t.ok(chokidar.watch.calledOnce);
		t.strictDeepEqual(chokidar.watch.firstCall.args, [
			['node_modules/foo/*.js'].concat(files),
			{
				ignored: defaultIgnore.map(dir => `${dir}/**/*`).concat('!node_modules/foo/*.js'),
				ignoreInitial: true
			}
		]);
	});

	test('starts running the initial tests', t => {
		t.plan(8);

		let done;
		api.run.returns(new Promise(resolve => {
			done = () => {
				resolve(runStatus);
			};
		}));

		start();
		t.ok(logger.clear.notCalled);
		t.ok(logger.reset.notCalled);
		t.ok(logger.start.notCalled);
		t.ok(api.run.calledOnce);
		t.strictDeepEqual(api.run.firstCall.args, [files, {runOnlyExclusive: false}]);

		// Finish is only called after the run promise fulfils
		t.ok(logger.finish.notCalled);
		done();
		return delay().then(() => {
			t.ok(logger.finish.calledOnce);
			t.is(logger.finish.firstCall.args[0], runStatus);
		});
	});

	[
		{
			label: 'is added',
			fire: add,
			event: 'add'
		},
		{
			label: 'changes',
			fire: change,
			event: 'change'
		},
		{
			label: 'is removed',
			fire: unlink,
			event: 'unlink'
		}
	].forEach(variant => {
		test(`logs a debug message when a file is ${variant.label}`, t => {
			t.plan(2);
			start();

			variant.fire('file.js');
			t.ok(debug.calledOnce);
			t.strictDeepEqual(debug.firstCall.args, ['ava:watcher', 'Detected %s of %s', variant.event, 'file.js']);
		});
	});

	[
		{
			label: 'is added',
			fire: add
		},
		{
			label: 'changes',
			fire: change
		},
		{
			label: 'is removed',
			fire: unlink
		}
	].forEach(variant => {
		test(`reruns initial tests when a source file ${variant.label}`, t => {
			t.plan(12);

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
				t.ok(logger.clear.calledOnce);
				t.ok(logger.reset.calledOnce);
				t.ok(logger.start.calledOnce);
				t.ok(api.run.calledTwice);
				// Clear is called before reset
				t.ok(logger.clear.firstCall.calledBefore(logger.reset.firstCall));
				// Reset is called before the second run
				t.ok(logger.reset.firstCall.calledBefore(api.run.secondCall));
				// Reset is called before start
				t.ok(logger.reset.firstCall.calledBefore(logger.start.firstCall));
				// No explicit files are provided
				t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);

				// Finish is only called after the run promise fulfils
				t.ok(logger.finish.calledOnce);
				t.is(logger.finish.firstCall.args[0], runStatus);

				resetRunStatus();
				done();
				return delay();
			}).then(() => {
				t.ok(logger.finish.calledTwice);
				t.is(logger.finish.secondCall.args[0], runStatus);
			});
		});
	});

	[
		{
			label: 'failures',
			prop: 'failCount'
		},
		{
			label: 'rejections',
			prop: 'rejectionCount'
		},
		{
			label: 'exceptions',
			prop: 'exceptionCount'
		}
	].forEach(variant => {
		test(`does not clear logger if the previous run had ${variant.label}`, t => {
			t.plan(2);

			runStatus[variant.prop] = 1;
			api.run.returns(Promise.resolve(runStatus));
			start();

			api.run.returns(Promise.resolve(resetRunStatus()));
			change();
			return debounce().then(() => {
				t.ok(logger.clear.notCalled);

				change();
				return debounce();
			}).then(() => {
				t.ok(logger.clear.calledOnce);
			});
		});
	});

	test('sections the logger if it was not cleared', t => {
		t.plan(5);

		api.run.returns(Promise.resolve({failCount: 1}));
		start();

		api.run.returns(Promise.resolve({failCount: 0}));
		change();
		return debounce().then(() => {
			t.ok(logger.clear.notCalled);
			t.ok(logger.reset.calledTwice);
			t.ok(logger.section.calledOnce);
			t.ok(logger.reset.firstCall.calledBefore(logger.section.firstCall));
			t.ok(logger.reset.secondCall.calledAfter(logger.section.firstCall));
		});
	});

	test('sections the logger if it could not be cleared', t => {
		t.plan(5);

		logger.clear.returns(false);
		api.run.returns(Promise.resolve(runStatus));
		start();

		change();
		return debounce().then(() => {
			t.ok(logger.clear.calledOnce);
			t.ok(logger.reset.calledTwice);
			t.ok(logger.section.calledOnce);
			t.ok(logger.reset.firstCall.calledBefore(logger.section.firstCall));
			t.ok(logger.reset.secondCall.calledAfter(logger.section.firstCall));
		});
	});

	test('does not section the logger if it was cleared', t => {
		t.plan(3);

		api.run.returns(Promise.resolve(runStatus));
		start();

		change();
		return debounce().then(() => {
			t.ok(logger.clear.calledOnce);
			t.ok(logger.section.notCalled);
			t.ok(logger.reset.calledOnce);
		});
	});

	test('debounces by 100ms', t => {
		t.plan(1);
		api.run.returns(Promise.resolve(runStatus));
		start();

		change();
		const before = clock.now;
		return debounce().then(() => {
			t.is(clock.now - before, 100);
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
			t.is(clock.now - before, 150);
			change();
			return debounce();
		}).then(() => {
			t.is(clock.now - before, 175);
			change();
			return debounce();
		}).then(() => {
			t.is(clock.now - before, 187);
			change();
			return debounce();
		}).then(() => {
			t.is(clock.now - before, 197);
		});
	});

	test('only reruns tests once the initial run has finished', t => {
		t.plan(2);

		let done;
		api.run.returns(new Promise(resolve => {
			done = () => {
				resolve({});
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
				resolve({});
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

	[
		{
			label: 'is added',
			fire: add
		},
		{
			label: 'changes',
			fire: change
		}
	].forEach(variant => {
		test(`(re)runs a test file when it ${variant.label}`, t => {
			t.plan(6);

			api.run.returns(Promise.resolve(runStatus));
			start();

			let done;
			api.run.returns(new Promise(resolve => {
				done = () => {
					resolve(runStatus);
				};
			}));

			variant.fire('test.js');
			return debounce().then(() => {
				t.ok(api.run.calledTwice);
				// The `test.js` file is provided
				t.strictDeepEqual(api.run.secondCall.args, [['test.js'], {runOnlyExclusive: false}]);

				// Finish is only called after the run promise fulfills
				t.ok(logger.finish.calledOnce);
				t.is(logger.finish.firstCall.args[0], runStatus);

				resetRunStatus();
				done();
				return delay();
			}).then(() => {
				t.ok(logger.finish.calledTwice);
				t.is(logger.finish.secondCall.args[0], runStatus);
			});
		});
	});

	test('(re)runs several test files when they are added or changed', t => {
		t.plan(2);
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('test-one.js');
		change('test-two.js');
		return debounce(2).then(() => {
			t.ok(api.run.calledTwice);
			// The test files are provided
			t.strictDeepEqual(api.run.secondCall.args, [['test-one.js', 'test-two.js'], {runOnlyExclusive: false}]);
		});
	});

	test('reruns initial tests if both source and test files are added or changed', t => {
		t.plan(2);
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('test.js');
		unlink('source.js');
		return debounce(2).then(() => {
			t.ok(api.run.calledTwice);
			// No explicit files are provided
			t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
		});
	});

	test('does nothing if tests are deleted', t => {
		t.plan(1);
		api.run.returns(Promise.resolve(runStatus));
		start();

		unlink('test.js');
		return debounce().then(() => {
			t.ok(api.run.calledOnce);
		});
	});

	test('determines whether changed files are tests based on the initial files patterns', t => {
		t.plan(2);

		files = ['foo-{bar,baz}.js'];
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('foo-bar.js');
		add('foo-baz.js');
		return debounce(2).then(() => {
			t.ok(api.run.calledTwice);
			t.strictDeepEqual(api.run.secondCall.args, [['foo-bar.js', 'foo-baz.js'], {runOnlyExclusive: false}]);
		});
	});

	test('initial exclude patterns override whether something is a test file', t => {
		t.plan(2);

		avaFiles = function (options) {
			const ret = new AvaFiles(options);
			// Note: There is no way for users to actually set exclude patterns yet.
			// This test just validates that internal updates to the default excludes pattern will be obeyed.
			ret.excludePatterns = ['!*bar*'];
			return ret;
		};
		Subject = proxyWatcher();

		files = ['foo-{bar,baz}.js'];
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('foo-bar.js');
		add('foo-baz.js');
		return debounce(2).then(() => {
			t.ok(api.run.calledTwice);
			// `foo-bar.js` is excluded from being a test file, thus the initial tests
			// are run
			t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
		});
	});

	test('test files must end in .js', t => {
		t.plan(2);

		files = ['foo.bar'];
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('foo.bar');
		return debounce(2).then(() => {
			t.ok(api.run.calledTwice);
			// `foo.bar` cannot be a test file, thus the initial tests are run
			t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
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
			t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
		});
	});

	test('files patterns may match directories', t => {
		t.plan(2);

		files = ['dir', 'another-dir/*/deeper'];
		api.run.returns(Promise.resolve(runStatus));
		start();

		add(path.join('dir', 'test.js'));
		add(path.join('dir', 'nested', 'test.js'));
		add(path.join('another-dir', 'nested', 'deeper', 'test.js'));
		return debounce(3).then(() => {
			t.ok(api.run.calledTwice);
			t.strictDeepEqual(api.run.secondCall.args, [
				[
					path.join('dir', 'test.js'),
					path.join('dir', 'nested', 'test.js'),
					path.join('another-dir', 'nested', 'deeper', 'test.js')
				],
				{runOnlyExclusive: false}
			]);
		});
	});

	test('exclude patterns override directory matches', t => {
		t.plan(2);

		avaFiles = function (options) {
			const ret = new AvaFiles(options);
			// Note: There is no way for users to actually set exclude patterns yet.
			// This test just validates that internal updates to the default excludes pattern will be obeyed.
			ret.excludePatterns = ['!**/exclude/**'];
			return ret;
		};

		Subject = proxyWatcher();

		files = ['dir'];
		api.run.returns(Promise.resolve(runStatus));
		start();

		add(path.join('dir', 'exclude', 'foo.js'));
		return debounce(2).then(() => {
			t.ok(api.run.calledTwice);
			// `dir/exclude/foo.js` is excluded from being a test file, thus the initial
			// tests are run
			t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
		});
	});

	['r', 'rs'].forEach(input => {
		test(`reruns initial tests when "${input}" is entered on stdin`, t => {
			t.plan(4);
			api.run.returns(Promise.resolve(runStatus));
			start().observeStdin(stdin);

			stdin.write(`${input}\n`);
			return delay().then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);

				stdin.write(`\t${input}  \n`);
				return delay();
			}).then(() => {
				t.ok(api.run.calledThrice);
				t.strictDeepEqual(api.run.thirdCall.args, [files, {runOnlyExclusive: false}]);
			});
		});

		test(`entering "${input}" on stdin prevents the logger from being cleared`, t => {
			t.plan(2);
			api.run.returns(Promise.resolve({failCount: 0}));
			start().observeStdin(stdin);

			stdin.write(`${input}\n`);
			return delay().then(() => {
				t.ok(api.run.calledTwice);
				t.ok(logger.clear.notCalled);
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
					resolve({});
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
				t.is(before, clock.now);

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
				t.is(clock.now - before, 100);
				before = clock.now;

				const previous = done;
				api.run.returns(new Promise(resolve => {
					done = () => {
						resolve({});
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
				t.is(api.run.callCount, 4);

				// Try to advance the clock. This is *after* input was processed. The
				// debounce timeout should have been canceled, so the clock can't have
				// advanced.
				clock.next();
				t.is(before, clock.now);
			});
		});
	});

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

		emitChokidar('foo');
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
			} catch (err) {
				t.is(err, expected);
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
			} catch (err) {
				t.is(err, expected);
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
				on(event, fn) {
					runStatusEmitter.on(event, fn);
				}
			};
		});

		const emitDependencies = (file, dependencies) => {
			runStatusEmitter.emit('dependencies', file, dependencies);
		};

		const seed = sources => {
			let done;
			api.run.returns(new Promise(resolve => {
				done = () => {
					resolve({});
				};
			}));

			const watcher = start(sources);
			const files = [path.join('test', '1.js'), path.join('test', '2.js')];
			const absFiles = files.map(relFile => path.resolve(relFile));
			apiEmitter.emit('test-run', runStatus, absFiles);
			emitDependencies(files[0], [path.resolve('dep-1.js'), path.resolve('dep-3.js')]);
			emitDependencies(files[1], [path.resolve('dep-2.js'), path.resolve('dep-3.js')]);

			done();
			api.run.returns(new Promise(() => {}));
			return watcher;
		};

		test('runs specific tests that depend on changed sources', t => {
			t.plan(2);
			seed();

			change('dep-1.js');
			return debounce().then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[path.join('test', '1.js')], {runOnlyExclusive: false}]);
			});
		});

		test('reruns all tests if a source cannot be mapped to a particular test', t => {
			t.plan(2);
			seed();

			change('cannot-be-mapped.js');
			return debounce().then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
			});
		});

		test('runs changed tests and tests that depend on changed sources', t => {
			t.plan(2);
			seed();

			change('dep-1.js');
			change(path.join('test', '2.js'));
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [
					[path.join('test', '2.js'), path.join('test', '1.js')],
					{runOnlyExclusive: false}
				]);
			});
		});

		test('avoids duplication when both a test and a source dependency change', t => {
			t.plan(2);
			seed();

			change(path.join('test', '1.js'));
			change('dep-1.js');
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[path.join('test', '1.js')], {runOnlyExclusive: false}]);
			});
		});

		test('stops tracking unlinked tests', t => {
			t.plan(2);
			seed();

			unlink(path.join('test', '1.js'));
			change('dep-3.js');
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[path.join('test', '2.js')], {runOnlyExclusive: false}]);
			});
		});

		test('updates test dependencies', t => {
			t.plan(2);
			seed();

			emitDependencies(path.join('test', '1.js'), [path.resolve('dep-4.js')]);
			change('dep-4.js');
			return debounce().then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[path.join('test', '1.js')], {runOnlyExclusive: false}]);
			});
		});

		[
			{
				desc: 'only tracks source dependencies',
				sources: ['dep-1.js']
			},
			{
				desc: 'exclusion patterns affect tracked source dependencies',
				sources: ['!dep-2.js']
			}
		].forEach(variant => {
			test(variant.desc, t => {
				t.plan(2);
				seed(variant.sources);

				// `dep-2.js` isn't treated as a source and therefore it's not tracked as
				// a dependency for `test/2.js`. Pretend Chokidar detected a change to
				// verify (normally Chokidar would also be ignoring this file but hey).
				change('dep-2.js');
				return debounce().then(() => {
					t.ok(api.run.calledTwice);
					// Expect all tests to be rerun since `dep-2.js` is not a tracked
					// dependency
					t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
				});
			});
		});

		test('uses default source patterns', t => {
			t.plan(4);
			seed();

			emitDependencies(path.join('test', '1.js'), [path.resolve('package.json'), path.resolve('index.js'), path.resolve('lib/util.js')]);
			emitDependencies(path.join('test', '2.js'), [path.resolve('foo.bar')]);
			change('package.json');
			change('index.js');
			change(path.join('lib', 'util.js'));

			api.run.returns(Promise.resolve(runStatus));
			return debounce(3).then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[path.join('test', '1.js')], {runOnlyExclusive: false}]);

				change('foo.bar');
				return debounce();
			}).then(() => {
				t.ok(api.run.calledThrice);
				// Expect all tests to be rerun since `foo.bar` is not a tracked
				// dependency
				t.strictDeepEqual(api.run.thirdCall.args, [files, {runOnlyExclusive: false}]);
			});
		});

		test('uses default exclusion patterns', t => {
			t.plan(2);

			// Ensure each directory is treated as containing sources
			seed(['**/*']);

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
				path.join('test', '1.js'),
				excludedFiles.map(relPath => path.resolve(relPath)).concat('dep-1.js')
			);

			// Modify all excluded files
			excludedFiles.forEach(change);

			return debounce(excludedFiles.length).then(() => {
				t.ok(api.run.calledTwice);
				// Since the excluded files are not tracked as a dependency, all tests
				// are expected to be rerun
				t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
			});
		});

		test('allows default exclusion patterns to be overriden', t => {
			t.plan(2);
			seed(['node_modules/foo/*.js']);

			const dep = path.join('node_modules', 'foo', 'index.js');
			emitDependencies(path.join('test', '1.js'), [path.resolve(dep)]);
			change(dep);

			return debounce(1).then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[path.join('test', '1.js')], {runOnlyExclusive: false}]);
			});
		});

		test('ignores dependencies outside of the current working directory', t => {
			t.plan(4);
			seed(['**/*.js', '..foo.js']);

			emitDependencies(path.join('test', '1.js'), [path.resolve('../outside.js')]);
			emitDependencies(path.join('test', '2.js'), [path.resolve('..foo.js')]);
			// Pretend Chokidar detected a change to verify (normally Chokidar would
			// also be ignoring this file but hey)
			change(path.join('..', 'outside.js'));

			api.run.returns(Promise.resolve({failCount: 0}));
			return debounce().then(() => {
				t.ok(api.run.calledTwice);
				// If `../outside.js` was tracked as a dependency of test/1.js this would
				// have caused `test/1.js` to be rerun. Instead expect all tests to be
				// rerun. This is somewhat artifical: normally changes to `../outside.js`
				// wouldn't even be picked up. However this lets us test dependency
				// tracking without directly inspecting the internal state of the
				// watcher.
				t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);

				change('..foo.js');
				return debounce();
			}).then(() => {
				t.ok(api.run.calledThrice);
				t.strictDeepEqual(api.run.thirdCall.args, [[path.join('test', '2.js')], {runOnlyExclusive: false}]);
			});
		});

		test('logs a debug message when a dependent test is found', t => {
			t.plan(2);
			seed();

			change('dep-1.js');
			return debounce().then(() => {
				t.ok(debug.calledTwice);
				t.strictDeepEqual(debug.secondCall.args, ['ava:watcher', '%s is a dependency of %s', 'dep-1.js', path.join('test', '1.js')]);
			});
		});

		test('logs a debug message when sources remain without dependent tests', t => {
			t.plan(2);
			seed();

			change('cannot-be-mapped.js');
			return debounce().then(() => {
				t.ok(debug.calledTwice);
				t.strictDeepEqual(debug.secondCall.args, ['ava:watcher', 'Sources remain that cannot be traced to specific tests. Rerunning all tests']);
			});
		});
	});

	group('.only is sticky', (beforeEach, test) => {
		let apiEmitter;
		beforeEach(() => {
			apiEmitter = new EventEmitter();
			api.on = (event, fn) => {
				apiEmitter.on(event, fn);
			};
		});

		const emitStats = (file, hasExclusive) => {
			apiEmitter.emit('stats', {
				file,
				hasExclusive
			});
		};

		const t1 = path.join('test', '1.js');
		const t2 = path.join('test', '2.js');
		const t3 = path.join('test', '3.js');
		const t4 = path.join('test', '4.js');

		const seed = () => {
			let done;
			api.run.returns(new Promise(resolve => {
				done = () => {
					resolve({});
				};
			}));

			const watcher = start();
			emitStats(t1, true);
			emitStats(t2, true);
			emitStats(t3, false);
			emitStats(t4, false);

			done();
			api.run.returns(new Promise(() => {}));
			return watcher;
		};

		test('changed test files (none of which previously contained .only) are run in exclusive mode', t => {
			t.plan(2);
			seed();

			change(t3);
			change(t4);
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[t1, t2, t3, t4], {runOnlyExclusive: true}]);
			});
		});

		test('changed test files (comprising some, but not all, files that previously contained .only) are run in exclusive mode', t => {
			t.plan(2);
			seed();

			change(t1);
			change(t4);
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[t1, t2, t4], {runOnlyExclusive: true}]);
			});
		});

		test('changed test files (comprising all files that previously contained .only) are run in regular mode', t => {
			t.plan(2);
			seed();

			change(t1);
			change(t2);
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[t1, t2], {runOnlyExclusive: false}]);
			});
		});

		test('once no test files contain .only, further changed test files are run in regular mode', t => {
			t.plan(2);
			seed();

			emitStats(t1, false);
			emitStats(t2, false);

			change(t3);
			change(t4);
			return debounce(2).then(() => {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[t3, t4], {runOnlyExclusive: false}]);
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
				t.strictDeepEqual(api.run.secondCall.args, [[t3, t4], {runOnlyExclusive: false}]);
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
				on(event, fn) {
					runStatusEmitter.on(event, fn);
				}
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
			const files = [path.join('test', '1.js'), path.join('test', '2.js')];
			apiEmitter.emit('test-run', runStatus, files.map(relFile => {
				return path.resolve(relFile);
			}));

			if (seedFailures) {
				seedFailures(files);
			}

			done();
			api.run.returns(new Promise(() => {}));
			return watcher;
		};

		const rerun = function (file) {
			runStatus = {on: runStatus.on};
			let done;
			api.run.returns(new Promise(resolve => {
				done = () => {
					resolve(runStatus);
				};
			}));

			change(file);
			return debounce().then(() => {
				apiEmitter.emit('test-run', runStatus, [path.resolve(file)]);
				done();

				api.run.returns(new Promise(() => {}));
			});
		};

		test('sets runStatus.previousFailCount to 0 if there were no previous failures', t => {
			t.plan(1);

			seed(files => {
				runStatusEmitter.emit('error', {file: files[0]});
			});
			return debounce().then(() => {
				t.is(runStatus.previousFailCount, 0);
			});
		});

		test('sets runStatus.previousFailCount if there were prevous failures', t => {
			t.plan(1);

			let other;
			seed(files => {
				runStatusEmitter.emit('test', {
					file: files[0],
					error: {}
				});

				runStatusEmitter.emit('error', {
					file: files[0]
				});

				other = files[1];
			});

			return rerun(other).then(() => {
				t.is(runStatus.previousFailCount, 2);
			});
		});

		test('tracks failures from multiple files', t => {
			t.plan(1);

			let first;

			seed(files => {
				runStatusEmitter.emit('test', {
					file: files[0],
					error: {}
				});

				runStatusEmitter.emit('error', {file: files[1]});

				first = files[0];
			});

			return rerun(first).then(() => {
				t.is(runStatus.previousFailCount, 1);
			});
		});

		test('previous failures don\'t count when that file is rerun', t => {
			t.plan(1);

			let same;

			seed(files => {
				runStatusEmitter.emit('test', {
					file: files[0],
					error: {}
				});

				runStatusEmitter.emit('error', {file: files[0]});

				same = files[0];
			});

			return rerun(same).then(() => {
				t.is(runStatus.previousFailCount, 0);
			});
		});

		test('previous failures don\'t count when that file is deleted', t => {
			t.plan(1);

			let same;
			let other;

			seed(files => {
				runStatusEmitter.emit('test', {
					file: files[0],
					error: {}
				});

				runStatusEmitter.emit('error', {file: files[0]});

				same = files[0];
				other = files[1];
			});

			unlink(same);

			return debounce().then(() => rerun(other)).then(() => {
				t.is(runStatus.previousFailCount, 0);
			});
		});
	});
});
