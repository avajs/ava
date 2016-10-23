'use strict';
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var PassThrough = require('stream').PassThrough;
var Promise = require('bluebird');
var defaultIgnore = require('ignore-by-default').directories();
var lolex = require('lolex');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var test = require('tap').test;
var AvaFiles = require('ava-files');

var setImmediate = require('../lib/globals').setImmediate;

// Helper to make using beforeEach less arduous.
function makeGroup(test) {
	return function (desc, fn) {
		test(desc, function (t) {
			var beforeEach = function (fn) {
				t.beforeEach(function (done) {
					fn();
					done();
				});
			};

			var pending = [];
			var test = function (name, fn) {
				pending.push(t.test(name, fn));
			};

			fn(beforeEach, test, makeGroup(test));

			return Promise.all(pending);
		});
	};
}
var group = makeGroup(test);

group('chokidar', function (beforeEach, test, group) {
	var chokidar;
	var debug;
	var logger;
	var api;
	var avaFiles;
	var Subject;
	var runStatus;
	var resetRunStatus;
	var clock;
	var chokidarEmitter;
	var stdin;
	var files;

	function proxyWatcher(opts) {
		return proxyquire.noCallThru().load('../lib/watcher', opts ||
			{
				chokidar: chokidar,
				debug: function (name) {
					return function () {
						var args = [name];
						args.push.apply(args, arguments);
						debug.apply(null, args);
					};
				},
				'ava-files': avaFiles
			});
	}

	beforeEach(function () {
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
			on: function () {},
			run: sinon.stub()
		};

		resetRunStatus = function () {
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

		api.run.returns(new Promise(function () {}));
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

	var start = function (sources) {
		return new Subject(logger, api, files, sources || []);
	};

	var emitChokidar = function (event, path) {
		chokidarEmitter.emit('all', event, path);
	};

	var add = function (path) {
		emitChokidar('add', path || 'source.js');
	};
	var change = function (path) {
		emitChokidar('change', path || 'source.js');
	};
	var unlink = function (path) {
		emitChokidar('unlink', path || 'source.js');
	};

	var delay = function () {
		return new Promise(function (resolve) {
			setImmediate(resolve);
		});
	};

	// Advance the clock to get past the debounce timeout, then wait for a promise
	// to be resolved to get past the busy.then() delay.
	var debounce = function (times) {
		times = times >= 0 ? times : 1;
		clock.next();
		return delay().then(function () {
			if (times > 1) {
				return debounce(times - 1);
			}
		});
	};

	test('watches for default source file changes, as well as test files', function (t) {
		t.plan(2);
		start();

		t.ok(chokidar.watch.calledOnce);
		t.strictDeepEqual(chokidar.watch.firstCall.args, [
			['package.json', '**/*.js'].concat(files),
			{
				ignored: defaultIgnore.map(function (dir) {
					return dir + '/**/*';
				}),
				ignoreInitial: true
			}
		]);
	});

	test('watched source files are configurable', function (t) {
		t.plan(2);
		start(['foo.js', '!bar.js', 'baz.js', '!qux.js']);

		t.ok(chokidar.watch.calledOnce);
		t.strictDeepEqual(chokidar.watch.firstCall.args, [
			['foo.js', 'baz.js'].concat(files),
			{
				ignored: defaultIgnore.map(function (dir) {
					return dir + '/**/*';
				}).concat('bar.js', 'qux.js'),
				ignoreInitial: true
			}
		]);
	});

	test('configured sources can override default ignore patterns', function (t) {
		t.plan(2);
		start(['node_modules/foo/*.js']);

		t.ok(chokidar.watch.calledOnce);
		t.strictDeepEqual(chokidar.watch.firstCall.args, [
			['node_modules/foo/*.js'].concat(files),
			{
				ignored: defaultIgnore.map(function (dir) {
					return dir + '/**/*';
				}).concat('!node_modules/foo/*.js'),
				ignoreInitial: true
			}
		]);
	});

	test('starts running the initial tests', function (t) {
		t.plan(8);

		var done;
		api.run.returns(new Promise(function (resolve) {
			done = function () {
				resolve(runStatus);
			};
		}));

		start();
		t.ok(logger.clear.notCalled);
		t.ok(logger.reset.notCalled);
		t.ok(logger.start.notCalled);
		t.ok(api.run.calledOnce);
		t.strictDeepEqual(api.run.firstCall.args, [files, {runOnlyExclusive: false}]);

		// finish is only called after the run promise fulfils.
		t.ok(logger.finish.notCalled);
		done();
		return delay().then(function () {
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
	].forEach(function (variant) {
		test('logs a debug message when a file is ' + variant.label, function (t) {
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
	].forEach(function (variant) {
		test('reruns initial tests when a source file ' + variant.label, function (t) {
			t.plan(12);

			api.run.returns(Promise.resolve(runStatus));
			start();

			var done;
			api.run.returns(new Promise(function (resolve) {
				done = function () {
					resolve(runStatus);
				};
			}));

			variant.fire();
			return debounce().then(function () {
				t.ok(logger.clear.calledOnce);
				t.ok(logger.reset.calledOnce);
				t.ok(logger.start.calledOnce);
				t.ok(api.run.calledTwice);
				// clear is called before reset.
				t.ok(logger.clear.firstCall.calledBefore(logger.reset.firstCall));
				// reset is called before the second run.
				t.ok(logger.reset.firstCall.calledBefore(api.run.secondCall));
				// reset is called before start
				t.ok(logger.reset.firstCall.calledBefore(logger.start.firstCall));
				// no explicit files are provided.
				t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);

				// finish is only called after the run promise fulfils.
				t.ok(logger.finish.calledOnce);
				t.is(logger.finish.firstCall.args[0], runStatus);

				resetRunStatus();
				done();
				return delay();
			}).then(function () {
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
	].forEach(function (variant) {
		test('does not clear logger if the previous run had ' + variant.label, function (t) {
			t.plan(2);

			runStatus[variant.prop] = 1;
			api.run.returns(Promise.resolve(runStatus));
			start();

			api.run.returns(Promise.resolve(resetRunStatus()));
			change();
			return debounce().then(function () {
				t.ok(logger.clear.notCalled);

				change();
				return debounce();
			}).then(function () {
				t.ok(logger.clear.calledOnce);
			});
		});
	});

	test('sections the logger if it was not cleared', function (t) {
		t.plan(5);

		api.run.returns(Promise.resolve({failCount: 1}));
		start();

		api.run.returns(Promise.resolve({failCount: 0}));
		change();
		return debounce().then(function () {
			t.ok(logger.clear.notCalled);
			t.ok(logger.reset.calledTwice);
			t.ok(logger.section.calledOnce);
			t.ok(logger.reset.firstCall.calledBefore(logger.section.firstCall));
			t.ok(logger.reset.secondCall.calledAfter(logger.section.firstCall));
		});
	});

	test('sections the logger if it could not be cleared', function (t) {
		t.plan(5);

		logger.clear.returns(false);
		api.run.returns(Promise.resolve(runStatus));
		start();

		change();
		return debounce().then(function () {
			t.ok(logger.clear.calledOnce);
			t.ok(logger.reset.calledTwice);
			t.ok(logger.section.calledOnce);
			t.ok(logger.reset.firstCall.calledBefore(logger.section.firstCall));
			t.ok(logger.reset.secondCall.calledAfter(logger.section.firstCall));
		});
	});

	test('does not section the logger if it was cleared', function (t) {
		t.plan(3);

		api.run.returns(Promise.resolve(runStatus));
		start();

		change();
		return debounce().then(function () {
			t.ok(logger.clear.calledOnce);
			t.ok(logger.section.notCalled);
			t.ok(logger.reset.calledOnce);
		});
	});

	test('debounces by 10ms', function (t) {
		t.plan(1);
		api.run.returns(Promise.resolve(runStatus));
		start();

		change();
		var before = clock.now;
		return debounce().then(function () {
			t.is(clock.now - before, 10);
		});
	});

	test('debounces again if changes occur in the interval', function (t) {
		t.plan(2);
		api.run.returns(Promise.resolve(runStatus));
		start();

		change();
		change();

		var before = clock.now;
		return debounce(2).then(function () {
			t.is(clock.now - before, 2 * 10);
			change();
			return debounce();
		}).then(function () {
			t.is(clock.now - before, 3 * 10);
		});
	});

	test('only reruns tests once the initial run has finished', function (t) {
		t.plan(2);

		var done;
		api.run.returns(new Promise(function (resolve) {
			done = function () {
				resolve({});
			};
		}));
		start();

		change();
		clock.next();
		return delay().then(function () {
			t.ok(api.run.calledOnce);

			done();
			return delay();
		}).then(function () {
			t.ok(api.run.calledTwice);
		});
	});

	test('only reruns tests once the previous run has finished', function (t) {
		t.plan(3);
		api.run.returns(Promise.resolve(runStatus));
		start();

		var done;
		api.run.returns(new Promise(function (resolve) {
			done = function () {
				resolve({});
			};
		}));

		change();
		return debounce().then(function () {
			t.ok(api.run.calledTwice);

			change();
			clock.next();
			return delay();
		}).then(function () {
			t.ok(api.run.calledTwice);

			done();
			return delay();
		}).then(function () {
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
	].forEach(function (variant) {
		test('(re)runs a test file when it ' + variant.label, function (t) {
			t.plan(6);

			api.run.returns(Promise.resolve(runStatus));
			start();

			var done;
			api.run.returns(new Promise(function (resolve) {
				done = function () {
					resolve(runStatus);
				};
			}));

			variant.fire('test.js');
			return debounce().then(function () {
				t.ok(api.run.calledTwice);
				// the test.js file is provided
				t.strictDeepEqual(api.run.secondCall.args, [['test.js'], {runOnlyExclusive: false}]);

				// finish is only called after the run promise fulfils.
				t.ok(logger.finish.calledOnce);
				t.is(logger.finish.firstCall.args[0], runStatus);

				resetRunStatus();
				done();
				return delay();
			}).then(function () {
				t.ok(logger.finish.calledTwice);
				t.is(logger.finish.secondCall.args[0], runStatus);
			});
		});
	});

	test('(re)runs several test files when they are added or changed', function (t) {
		t.plan(2);
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('test-one.js');
		change('test-two.js');
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			// the test files are provided
			t.strictDeepEqual(api.run.secondCall.args, [['test-one.js', 'test-two.js'], {runOnlyExclusive: false}]);
		});
	});

	test('reruns initial tests if both source and test files are added or changed', function (t) {
		t.plan(2);
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('test.js');
		unlink('source.js');
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			// no explicit files are provided.
			t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
		});
	});

	test('does nothing if tests are deleted', function (t) {
		t.plan(1);
		api.run.returns(Promise.resolve(runStatus));
		start();

		unlink('test.js');
		return debounce().then(function () {
			t.ok(api.run.calledOnce);
		});
	});

	test('determines whether changed files are tests based on the initial files patterns', function (t) {
		t.plan(2);

		files = ['foo-{bar,baz}.js'];
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('foo-bar.js');
		add('foo-baz.js');
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			t.strictDeepEqual(api.run.secondCall.args, [['foo-bar.js', 'foo-baz.js'], {runOnlyExclusive: false}]);
		});
	});

	test('initial exclude patterns override whether something is a test file', function (t) {
		t.plan(2);

		avaFiles = function (options) {
			var ret = new AvaFiles(options);
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
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			// foo-bar.js is excluded from being a test file, thus the initial tests
			// are run.
			t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
		});
	});

	test('test files must end in .js', function (t) {
		t.plan(2);

		files = ['foo.bar'];
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('foo.bar');
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			// foo.bar cannot be a test file, thus the initial tests are run.
			t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
		});
	});

	test('test files must not start with an underscore', function (t) {
		t.plan(2);

		api.files = ['_foo.bar'];
		api.run.returns(Promise.resolve(runStatus));
		start();

		add('_foo.bar');
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			// _foo.bar cannot be a test file, thus the initial tests are run.
			t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
		});
	});

	test('files patterns may match directories', function (t) {
		t.plan(2);

		files = ['dir', 'another-dir/*/deeper'];
		api.run.returns(Promise.resolve(runStatus));
		start();

		add(path.join('dir', 'test.js'));
		add(path.join('dir', 'nested', 'test.js'));
		add(path.join('another-dir', 'nested', 'deeper', 'test.js'));
		return debounce(3).then(function () {
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

	test('exclude patterns override directory matches', function (t) {
		t.plan(2);

		avaFiles = function (options) {
			var ret = new AvaFiles(options);
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
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			// dir/exclude/foo.js is excluded from being a test file, thus the initial
			// tests are run.
			t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
		});
	});

	['r', 'rs'].forEach(function (input) {
		test('reruns initial tests when "' + input + '" is entered on stdin', function (t) {
			t.plan(4);
			api.run.returns(Promise.resolve(runStatus));
			start().observeStdin(stdin);

			stdin.write(input + '\n');
			return delay().then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);

				stdin.write('\t' + input + '  \n');
				return delay();
			}).then(function () {
				t.ok(api.run.calledThrice);
				t.strictDeepEqual(api.run.thirdCall.args, [files, {runOnlyExclusive: false}]);
			});
		});

		test('entering "' + input + '" on stdin prevents the logger from being cleared', function (t) {
			t.plan(2);
			api.run.returns(Promise.resolve({failCount: 0}));
			start().observeStdin(stdin);

			stdin.write(input + '\n');
			return delay().then(function () {
				t.ok(api.run.calledTwice);
				t.ok(logger.clear.notCalled);
			});
		});

		test('entering "' + input + '" on stdin cancels any debouncing', function (t) {
			t.plan(7);
			api.run.returns(Promise.resolve(runStatus));
			start().observeStdin(stdin);

			var before = clock.now;
			var done;
			api.run.returns(new Promise(function (resolve) {
				done = function () {
					resolve({});
				};
			}));

			add();
			stdin.write(input + '\n');
			return delay().then(function () {
				// Processing "rs" caused a new run.
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
				stdin.write(input + '\n');

				return delay();
			}).then(function () {
				// No new runs yet.
				t.ok(api.run.calledTwice);
				// Though the clock has advanced.
				t.is(clock.now - before, 10);
				before = clock.now;

				var previous = done;
				api.run.returns(new Promise(function (resolve) {
					done = function () {
						resolve({});
					};
				}));

				// Finish the previous run.
				previous();

				return delay();
			}).then(function () {
				// There's only one new run.
				t.ok(api.run.calledThrice);

				stdin.write(input + '\n');
				return delay();
			}).then(function () {
				add();

				// Finish the previous run. This should cause a new run due to the
				// input.
				done();

				return delay();
			}).then(function () {
				// Again there's only one new run.
				t.is(api.run.callCount, 4);

				// Try to advance the clock. This is *after* input was processed. The
				// debounce timeout should have been canceled, so the clock can't have
				// advanced.
				clock.next();
				t.is(before, clock.now);
			});
		});
	});

	test('does nothing if anything other than "rs" is entered on stdin', function (t) {
		t.plan(1);
		api.run.returns(Promise.resolve(runStatus));
		start().observeStdin(stdin);

		stdin.write('foo\n');
		return debounce().then(function () {
			t.ok(api.run.calledOnce);
		});
	});

	test('ignores unexpected events from chokidar', function (t) {
		t.plan(1);
		api.run.returns(Promise.resolve(runStatus));
		start();

		emitChokidar('foo');
		return debounce().then(function () {
			t.ok(api.run.calledOnce);
		});
	});

	test('initial run rejects', function (t) {
		t.plan(1);
		var expected = new Error();
		api.run.returns(Promise.reject(expected));
		start();

		return delay().then(function () {
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

	test('subsequent run rejects', function (t) {
		t.plan(1);
		api.run.returns(Promise.resolve(runStatus));
		start();

		var expected = new Error();
		api.run.returns(Promise.reject(expected));

		add();
		return debounce().then(function () {
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

	group('tracks test dependencies', function (beforeEach, test) {
		var apiEmitter;
		var runStatus;
		var runStatusEmitter;
		beforeEach(function () {
			apiEmitter = new EventEmitter();
			api.on = function (event, fn) {
				apiEmitter.on(event, fn);
			};
			runStatusEmitter = new EventEmitter();
			runStatus = {
				on: function (event, fn) {
					runStatusEmitter.on(event, fn);
				}
			};
		});

		var emitDependencies = function (file, dependencies) {
			runStatusEmitter.emit('dependencies', file, dependencies);
		};

		var seed = function (sources) {
			var done;
			api.run.returns(new Promise(function (resolve) {
				done = function () {
					resolve({});
				};
			}));

			var watcher = start(sources);
			var files = [path.join('test', '1.js'), path.join('test', '2.js')];
			var absFiles = files.map(function (relFile) {
				return path.resolve(relFile);
			});
			apiEmitter.emit('test-run', runStatus, absFiles);
			emitDependencies(files[0], [path.resolve('dep-1.js'), path.resolve('dep-3.js')]);
			emitDependencies(files[1], [path.resolve('dep-2.js'), path.resolve('dep-3.js')]);

			done();
			api.run.returns(new Promise(function () {}));
			return watcher;
		};

		test('runs specific tests that depend on changed sources', function (t) {
			t.plan(2);
			seed();

			change('dep-1.js');
			return debounce().then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[path.join('test', '1.js')], {runOnlyExclusive: false}]);
			});
		});

		test('reruns all tests if a source cannot be mapped to a particular test', function (t) {
			t.plan(2);
			seed();

			change('cannot-be-mapped.js');
			return debounce().then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
			});
		});

		test('runs changed tests and tests that depend on changed sources', function (t) {
			t.plan(2);
			seed();

			change('dep-1.js');
			change(path.join('test', '2.js'));
			return debounce(2).then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [
					[path.join('test', '2.js'), path.join('test', '1.js')],
					{runOnlyExclusive: false}
				]);
			});
		});

		test('avoids duplication when both a test and a source dependency change', function (t) {
			t.plan(2);
			seed();

			change(path.join('test', '1.js'));
			change('dep-1.js');
			return debounce(2).then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[path.join('test', '1.js')], {runOnlyExclusive: false}]);
			});
		});

		test('stops tracking unlinked tests', function (t) {
			t.plan(2);
			seed();

			unlink(path.join('test', '1.js'));
			change('dep-3.js');
			return debounce(2).then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[path.join('test', '2.js')], {runOnlyExclusive: false}]);
			});
		});

		test('updates test dependencies', function (t) {
			t.plan(2);
			seed();

			emitDependencies(path.join('test', '1.js'), [path.resolve('dep-4.js')]);
			change('dep-4.js');
			return debounce().then(function () {
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
		].forEach(function (variant) {
			test(variant.desc, function (t) {
				t.plan(2);
				seed(variant.sources);

				// dep-2.js isn't treated as a source and therefore it's not tracked as
				// a dependency for test/2.js. Pretend Chokidar detected a change to
				// verify (normally Chokidar would also be ignoring this file but hey).
				change('dep-2.js');
				return debounce().then(function () {
					t.ok(api.run.calledTwice);
					// Expect all tests to be rerun since dep-2.js is not a tracked
					// dependency.
					t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
				});
			});
		});

		test('uses default source patterns', function (t) {
			t.plan(4);
			seed();

			emitDependencies(path.join('test', '1.js'), [path.resolve('package.json'), path.resolve('index.js'), path.resolve('lib/util.js')]);
			emitDependencies(path.join('test', '2.js'), [path.resolve('foo.bar')]);
			change('package.json');
			change('index.js');
			change(path.join('lib', 'util.js'));

			api.run.returns(Promise.resolve(runStatus));
			return debounce(3).then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[path.join('test', '1.js')], {runOnlyExclusive: false}]);

				change('foo.bar');
				return debounce();
			}).then(function () {
				t.ok(api.run.calledThrice);
				// Expect all tests to be rerun since foo.bar is not a tracked
				// dependency.
				t.strictDeepEqual(api.run.thirdCall.args, [files, {runOnlyExclusive: false}]);
			});
		});

		test('uses default exclusion patterns', function (t) {
			t.plan(2);

			// Ensure each directory is treated as containing sources.
			seed(['**/*']);

			// Synthesize an excluded file for each directory that's ignored by
			// default. Apply deeper nesting for each file.
			var excludedFiles = defaultIgnore.map(function (dir, index) {
				var relPath = dir;
				for (var i = index; i >= 0; i--) {
					relPath = path.join(relPath, String(i));
				}
				return relPath + '.js';
			});

			// Ensure test/1.js also depends on the excluded files.
			emitDependencies(path.join('test', '1.js'), excludedFiles.map(function (relPath) {
				return path.resolve(relPath);
			}).concat('dep-1.js'));

			// Modify all excluded files.
			excludedFiles.forEach(change);

			return debounce(excludedFiles.length).then(function () {
				t.ok(api.run.calledTwice);
				// Since the excluded files are not tracked as a dependency, all tests
				// are expected to be rerun.
				t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);
			});
		});

		test('allows default exclusion patterns to be overriden', function (t) {
			t.plan(2);
			seed(['node_modules/foo/*.js']);

			var dep = path.join('node_modules', 'foo', 'index.js');
			emitDependencies(path.join('test', '1.js'), [path.resolve(dep)]);
			change(dep);

			return debounce(1).then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[path.join('test', '1.js')], {runOnlyExclusive: false}]);
			});
		});

		test('ignores dependencies outside of the current working directory', function (t) {
			t.plan(4);
			seed(['**/*.js', '..foo.js']);

			emitDependencies(path.join('test', '1.js'), [path.resolve('../outside.js')]);
			emitDependencies(path.join('test', '2.js'), [path.resolve('..foo.js')]);
			// Pretend Chokidar detected a change to verify (normally Chokidar would
			// also be ignoring this file but hey).
			change(path.join('..', 'outside.js'));

			api.run.returns(Promise.resolve({failCount: 0}));
			return debounce().then(function () {
				t.ok(api.run.calledTwice);
				// If ../outside.js was tracked as a dependency of test/1.js this would
				// have caused test/1.js to be rerun. Instead expect all tests to be
				// rerun. This is somewhat artifical: normally changes to ../outside.js
				// wouldn't even be picked up. However this lets us test dependency
				// tracking without directly inspecting the internal state of the
				// watcher.
				t.strictDeepEqual(api.run.secondCall.args, [files, {runOnlyExclusive: false}]);

				change('..foo.js');
				return debounce();
			}).then(function () {
				t.ok(api.run.calledThrice);
				t.strictDeepEqual(api.run.thirdCall.args, [[path.join('test', '2.js')], {runOnlyExclusive: false}]);
			});
		});

		test('logs a debug message when a dependent test is found', function (t) {
			t.plan(2);
			seed();

			change('dep-1.js');
			return debounce().then(function () {
				t.ok(debug.calledTwice);
				t.strictDeepEqual(debug.secondCall.args, ['ava:watcher', '%s is a dependency of %s', 'dep-1.js', path.join('test', '1.js')]);
			});
		});

		test('logs a debug message when sources remain without dependent tests', function (t) {
			t.plan(2);
			seed();

			change('cannot-be-mapped.js');
			return debounce().then(function () {
				t.ok(debug.calledTwice);
				t.strictDeepEqual(debug.secondCall.args, ['ava:watcher', 'Sources remain that cannot be traced to specific tests. Rerunning all tests']);
			});
		});
	});

	group('.only is sticky', function (beforeEach, test) {
		var apiEmitter;
		beforeEach(function () {
			apiEmitter = new EventEmitter();
			api.on = function (event, fn) {
				apiEmitter.on(event, fn);
			};
		});

		var emitStats = function (file, hasExclusive) {
			apiEmitter.emit('stats', {
				file: file,
				hasExclusive: hasExclusive
			});
		};

		var t1 = path.join('test', '1.js');
		var t2 = path.join('test', '2.js');
		var t3 = path.join('test', '3.js');
		var t4 = path.join('test', '4.js');

		var seed = function () {
			var done;
			api.run.returns(new Promise(function (resolve) {
				done = function () {
					resolve({});
				};
			}));

			var watcher = start();
			emitStats(t1, true);
			emitStats(t2, true);
			emitStats(t3, false);
			emitStats(t4, false);

			done();
			api.run.returns(new Promise(function () {}));
			return watcher;
		};

		test('changed test files (none of which previously contained .only) are run in exclusive mode', function (t) {
			t.plan(2);
			seed();

			change(t3);
			change(t4);
			return debounce(2).then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[t1, t2, t3, t4], {runOnlyExclusive: true}]);
			});
		});

		test('changed test files (comprising some, but not all, files that previously contained .only) are run in exclusive mode', function (t) {
			t.plan(2);
			seed();

			change(t1);
			change(t4);
			return debounce(2).then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[t1, t2, t4], {runOnlyExclusive: true}]);
			});
		});

		test('changed test files (comprising all files that previously contained .only) are run in regular mode', function (t) {
			t.plan(2);
			seed();

			change(t1);
			change(t2);
			return debounce(2).then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[t1, t2], {runOnlyExclusive: false}]);
			});
		});

		test('once no test files contain .only, further changed test files are run in regular mode', function (t) {
			t.plan(2);
			seed();

			emitStats(t1, false);
			emitStats(t2, false);

			change(t3);
			change(t4);
			return debounce(2).then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[t3, t4], {runOnlyExclusive: false}]);
			});
		});

		test('once test files containing .only are removed, further changed test files are run in regular mode', function (t) {
			t.plan(2);
			seed();

			unlink(t1);
			unlink(t2);
			change(t3);
			change(t4);
			return debounce(4).then(function () {
				t.ok(api.run.calledTwice);
				t.strictDeepEqual(api.run.secondCall.args, [[t3, t4], {runOnlyExclusive: false}]);
			});
		});
	});

	group('tracks previous failures', function (beforeEach, test) {
		var apiEmitter;
		var runStatus;
		var runStatusEmitter;
		beforeEach(function () {
			apiEmitter = new EventEmitter();
			api.on = function (event, fn) {
				apiEmitter.on(event, fn);
			};
			runStatusEmitter = new EventEmitter();
			runStatus = {
				on: function (event, fn) {
					runStatusEmitter.on(event, fn);
				}
			};
		});

		var seed = function (seedFailures) {
			var done;
			api.run.returns(new Promise(function (resolve) {
				done = function () {
					resolve(runStatus);
				};
			}));

			var watcher = start();
			var files = [path.join('test', '1.js'), path.join('test', '2.js')];
			apiEmitter.emit('test-run', runStatus, files.map(function (relFile) {
				return path.resolve(relFile);
			}));

			if (seedFailures) {
				seedFailures(files);
			}

			done();
			api.run.returns(new Promise(function () {}));
			return watcher;
		};

		var rerun = function (file) {
			runStatus = {on: runStatus.on};
			var done;
			api.run.returns(new Promise(function (resolve) {
				done = function () {
					resolve(runStatus);
				};
			}));

			change(file);
			return debounce().then(function () {
				apiEmitter.emit('test-run', runStatus, [path.resolve(file)]);
				done();

				api.run.returns(new Promise(function () {}));
			});
		};

		test('sets runStatus.previousFailCount to 0 if there were no previous failures', function (t) {
			t.plan(1);

			seed(function (files) {
				runStatusEmitter.emit('error', {file: files[0]});
			});
			return debounce().then(function () {
				t.is(runStatus.previousFailCount, 0);
			});
		});

		test('sets runStatus.previousFailCount if there were prevous failures', function (t) {
			t.plan(1);

			var other;
			seed(function (files) {
				runStatusEmitter.emit('test', {
					file: files[0],
					error: {}
				});

				runStatusEmitter.emit('error', {
					file: files[0]
				});

				other = files[1];
			});

			return rerun(other).then(function () {
				t.is(runStatus.previousFailCount, 2);
			});
		});

		test('tracks failures from multiple files', function (t) {
			t.plan(1);

			var first;

			seed(function (files) {
				runStatusEmitter.emit('test', {
					file: files[0],
					error: {}
				});

				runStatusEmitter.emit('error', {file: files[1]});

				first = files[0];
			});

			return rerun(first).then(function () {
				t.is(runStatus.previousFailCount, 1);
			});
		});

		test('previous failures don\'t count when that file is rerun', function (t) {
			t.plan(1);

			var same;

			seed(function (files) {
				runStatusEmitter.emit('test', {
					file: files[0],
					error: {}
				});

				runStatusEmitter.emit('error', {file: files[0]});

				same = files[0];
			});

			return rerun(same).then(function () {
				t.is(runStatus.previousFailCount, 0);
			});
		});

		test('previous failures don\'t count when that file is deleted', function (t) {
			t.plan(1);

			var same;
			var other;

			seed(function (files) {
				runStatusEmitter.emit('test', {
					file: files[0],
					error: {}
				});

				runStatusEmitter.emit('error', {file: files[0]});

				same = files[0];
				other = files[1];
			});

			unlink(same);

			return debounce().then(function () {
				return rerun(other);
			}).then(function () {
				t.is(runStatus.previousFailCount, 0);
			});
		});
	});
});
