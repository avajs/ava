'use strict';

var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var defaultIgnore = require('ignore-by-default').directories();
var lolex = require('lolex');
var path = require('path');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var PassThrough = require('stream').PassThrough;
var test = require('tap').test;

var setImmediate = require('../lib/globals').setImmediate;

test('chokidar is not installed', function (t) {
	t.plan(2);

	var subject = proxyquire.noCallThru().load('../lib/watcher', {
		chokidar: null
	});

	try {
		subject.start({}, {excludePatterns: []}, [], []);
	} catch (err) {
		t.is(err.name, 'AvaError');
		t.is(err.message, 'The optional dependency chokidar failed to install and is required for --watch. Chokidar is likely not supported on your platform.');
	}
});

test('chokidar is installed', function (_t) {
	var chokidar = {
		watch: sinon.stub()
	};

	var debug = sinon.spy();

	var logger = {
		finish: sinon.spy(),
		reset: sinon.spy()
	};

	var api = {
		run: sinon.stub(),
		excludePatterns: [
			'!**/node_modules/**',
			'!**/fixtures/**',
			'!**/helpers/**'
		]
	};

	var subject = proxyquire.noCallThru().load('../lib/watcher', {
		chokidar: chokidar,
		debug: function (name) {
			return function () {
				var args = [name];
				args.push.apply(args, arguments);
				debug.apply(null, args);
			};
		}
	});

	var clock;
	var emitter;
	var stdin;
	var files;
	_t.beforeEach(function (done) {
		if (clock) {
			clock.uninstall();
		}
		clock = lolex.install(0, ['setImmediate', 'setTimeout', 'clearTimeout']);

		emitter = new EventEmitter();
		chokidar.watch.reset();
		chokidar.watch.returns(emitter);

		debug.reset();

		logger.finish.reset();
		logger.reset.reset();

		api.run.reset();
		api.run.returns(new Promise(function () {}));
		files = [
			'test.js',
			'test-*.js',
			'test'
		];

		stdin = new PassThrough();
		stdin.pause();

		done();
	});

	var start = function (sources) {
		subject.start(logger, api, files, sources || [], stdin);
	};

	var add = function (path) {
		emitter.emit('all', 'add', path || 'source.js');
	};
	var change = function (path) {
		emitter.emit('all', 'change', path || 'source.js');
	};
	var unlink = function (path) {
		emitter.emit('all', 'unlink', path || 'source.js');
	};

	var delay = function () {
		return new Promise(function (now) {
			setImmediate(now);
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

	var pending = [];
	var test = function (name, fn) {
		pending.push(_t.test(name, fn));
	};

	test('watches for default source file changes, as well as test files', function (t) {
		t.plan(2);
		start();

		t.ok(chokidar.watch.calledOnce);
		t.same(chokidar.watch.firstCall.args, [
			['package.json', '**/*.js'].concat(files),
			{
				ignored: defaultIgnore,
				ignoreInitial: true
			}
		]);
	});

	test('watched source files are configurable', function (t) {
		t.plan(2);
		start(['foo.js', '!bar.js', 'baz.js', '!qux.js']);

		t.ok(chokidar.watch.calledOnce);
		t.same(chokidar.watch.firstCall.args, [
			['foo.js', 'baz.js'].concat(files),
			{
				ignored: ['bar.js', 'qux.js'],
				ignoreInitial: true
			}
		]);
	});

	test('default set of ignored files if configured sources does not contain exclusion patterns', function (t) {
		t.plan(2);
		start(['foo.js', 'baz.js']);

		t.ok(chokidar.watch.calledOnce);
		t.same(chokidar.watch.firstCall.args, [
			['foo.js', 'baz.js'].concat(files),
			{
				ignored: defaultIgnore,
				ignoreInitial: true
			}
		]);
	});

	test('starts running the initial tests', function (t) {
		t.plan(4);

		var done;
		api.run.returns(new Promise(function (resolve) {
			done = resolve;
		}));

		start();
		t.ok(api.run.calledOnce);
		t.same(api.run.firstCall.args, [files]);

		// finish is only called after the run promise fulfils.
		t.ok(logger.finish.notCalled);
		done();
		return delay().then(function () {
			t.ok(logger.finish.calledOnce);
		});
	});

	[
		{label: 'is added', fire: add, event: 'add'},
		{label: 'changes', fire: change, event: 'change'},
		{label: 'is removed', fire: unlink, event: 'unlink'}
	].forEach(function (variant) {
		test('logs a debug message when a file is ' + variant.label, function (t) {
			t.plan(2);
			start();

			variant.fire('file.js');
			t.ok(debug.calledOnce);
			t.same(debug.firstCall.args, ['ava:watcher', 'Detected %s of %s', variant.event, 'file.js']);
		});
	});

	[
		{label: 'is added', fire: add},
		{label: 'changes', fire: change},
		{label: 'is removed', fire: unlink}
	].forEach(function (variant) {
		test('reruns initial tests when a source file ' + variant.label, function (t) {
			t.plan(6);
			api.run.returns(Promise.resolve());
			start();

			var done;
			api.run.returns(new Promise(function (resolve) {
				done = resolve;
			}));

			// reset isn't called in the initial run.
			t.ok(logger.reset.notCalled);

			variant.fire();
			return debounce().then(function () {
				t.ok(api.run.calledTwice);
				// reset is called before the second run.
				t.ok(logger.reset.calledBefore(api.run.secondCall));
				// no explicit files are provided.
				t.same(api.run.secondCall.args, [files]);

				// finish is only called after the run promise fulfils.
				t.ok(logger.finish.calledOnce);
				done();
				return delay();
			}).then(function () {
				t.ok(logger.finish.calledTwice);
			});
		});
	});

	test('debounces by 10ms', function (t) {
		t.plan(1);
		api.run.returns(Promise.resolve());
		start();

		change();
		var before = clock.now;
		return debounce().then(function () {
			t.is(clock.now - before, 10);
		});
	});

	test('debounces again if changes occur in the interval', function (t) {
		t.plan(2);
		api.run.returns(Promise.resolve());
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
			done = resolve;
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
		api.run.returns(Promise.resolve());
		start();

		var done;
		api.run.returns(new Promise(function (resolve) {
			done = resolve;
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
		{label: 'is added', fire: add},
		{label: 'changes', fire: change}
	].forEach(function (variant) {
		test('(re)runs a test file when it ' + variant.label, function (t) {
			t.plan(6);
			api.run.returns(Promise.resolve());
			start();

			var done;
			api.run.returns(new Promise(function (resolve) {
				done = resolve;
			}));

			// reset isn't called in the initial run.
			t.ok(logger.reset.notCalled);

			variant.fire('test.js');
			return debounce().then(function () {
				t.ok(api.run.calledTwice);
				// reset is called before the second run.
				t.ok(logger.reset.calledBefore(api.run.secondCall));
				// the test.js file is provided
				t.same(api.run.secondCall.args, [['test.js']]);

				// finish is only called after the run promise fulfils.
				t.ok(logger.finish.calledOnce);
				done();
				return delay();
			}).then(function () {
				t.ok(logger.finish.calledTwice);
			});
		});
	});

	test('(re)runs several test files when they are added or changed', function (t) {
		t.plan(2);
		api.run.returns(Promise.resolve());
		start();

		add('test-one.js');
		change('test-two.js');
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			// the test files are provided
			t.same(api.run.secondCall.args, [['test-one.js', 'test-two.js']]);
		});
	});

	test('reruns initial tests if both source and test files are added or changed', function (t) {
		t.plan(2);
		api.run.returns(Promise.resolve());
		start();

		add('test.js');
		unlink('source.js');
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			// no explicit files are provided.
			t.same(api.run.secondCall.args, [files]);
		});
	});

	test('does nothing if tests are deleted', function (t) {
		t.plan(2);
		api.run.returns(Promise.resolve());
		start();

		unlink('test.js');
		return debounce().then(function () {
			t.ok(logger.reset.notCalled);
			t.ok(api.run.calledOnce);
		});
	});

	test('determines whether changed files are tests based on the initial files patterns', function (t) {
		t.plan(2);

		files = ['foo-{bar,baz}.js'];
		api.run.returns(Promise.resolve());
		start();

		add('foo-bar.js');
		add('foo-baz.js');
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			t.same(api.run.secondCall.args, [['foo-bar.js', 'foo-baz.js']]);
		});
	});

	test('initial exclude patterns override whether something is a test file', function (t) {
		t.plan(2);

		files = ['foo-{bar,baz}.js'];
		api.excludePatterns = ['!*bar*'];
		api.run.returns(Promise.resolve());
		start();

		add('foo-bar.js');
		add('foo-baz.js');
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			// foo-bar.js is excluded from being a test file, thus the initial tests
			// are run.
			t.same(api.run.secondCall.args, [files]);
		});
	});

	test('test files must end in .js', function (t) {
		t.plan(2);

		files = ['foo.bar'];
		api.run.returns(Promise.resolve());
		start();

		add('foo.bar');
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			// foo.bar cannot be a test file, thus the initial tests are run.
			t.same(api.run.secondCall.args, [files]);
		});
	});

	test('test files must not start with an underscore', function (t) {
		t.plan(2);

		api.files = ['_foo.bar'];
		api.run.returns(Promise.resolve());
		start();

		add('_foo.bar');
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			// _foo.bar cannot be a test file, thus the initial tests are run.
			t.same(api.run.secondCall.args, [files]);
		});
	});

	test('files patterns may match directories', function (t) {
		t.plan(2);

		files = ['dir', 'dir2/*/dir3'];
		api.run.returns(Promise.resolve());
		start();

		add(path.join('dir', 'foo.js'));
		add(path.join('dir2', 'foo', 'dir3', 'bar.js'));
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			t.same(api.run.secondCall.args, [[path.join('dir', 'foo.js'), path.join('dir2', 'foo', 'dir3', 'bar.js')]]);
		});
	});

	test('exclude patterns override directory matches', function (t) {
		t.plan(2);

		files = ['dir'];
		api.excludePatterns = ['!**/exclude/**'];
		api.run.returns(Promise.resolve());
		start();

		add(path.join('dir', 'exclude', 'foo.js'));
		return debounce(2).then(function () {
			t.ok(api.run.calledTwice);
			// dir/exclude/foo.js is excluded from being a test file, thus the initial
			// tests are run.
			t.same(api.run.secondCall.args, [files]);
		});
	});

	test('reruns initial tests when "rs" is entered on stdin', function (t) {
		t.plan(2);
		api.run.returns(Promise.resolve());
		start();

		stdin.write('rs\n');
		return delay().then(function () {
			t.ok(api.run.calledTwice);

			stdin.write('\trs  \n');
			return delay();
		}).then(function () {
			t.ok(api.run.calledThrice);
		});
	});

	test('entering "rs" on stdin cancels any debouncing', function (t) {
		t.plan(7);
		api.run.returns(Promise.resolve());
		start();

		var before = clock.now;
		var done;
		api.run.returns(new Promise(function (resolve) {
			done = resolve;
		}));

		add();
		stdin.write('rs\n');
		return delay().then(function () {
			// Processing "rs" caused a new run.
			t.ok(api.run.calledTwice);

			// Try to advance the clock. This is *after* "rs" was processed. The
			// debounce timeout should have been canceled, so the clock can't have
			// advanced.
			clock.next();
			t.is(before, clock.now);

			add();
			// Advance clock *before* "rs" is received. Note that the previous run
			// hasn't finished yet.
			clock.next();
			stdin.write('rs\n');

			return delay();
		}).then(function () {
			// No new runs yet.
			t.ok(api.run.calledTwice);
			// Though the clock has advanced.
			t.is(clock.now - before, 10);
			before = clock.now;

			var previous = done;
			api.run.returns(new Promise(function (resolve) {
				done = resolve;
			}));

			// Finish the previous run.
			previous();

			return delay();
		}).then(function () {
			// There's only one new run.
			t.ok(api.run.calledThrice);

			stdin.write('rs\n');
			return delay();
		}).then(function () {
			add();

			// Finish the previous run. This should cause a new run due to the "rs"
			// input.
			done();

			return delay();
		}).then(function () {
			// Again there's only one new run.
			t.is(api.run.callCount, 4);

			// Try to advance the clock. This is *after* "rs" was processed. The
			// debounce timeout should have been canceled, so the clock can't have
			// advanced.
			clock.next();
			t.is(before, clock.now);
		});
	});

	test('does nothing if anything other than "rs" is entered on stdin', function (t) {
		t.plan(2);
		api.run.returns(Promise.resolve());
		start();

		stdin.write('foo\n');
		return debounce().then(function () {
			t.ok(logger.reset.notCalled);
			t.ok(api.run.calledOnce);
		});
	});

	test('ignores unexpected events from chokidar', function (t) {
		t.plan(2);
		api.run.returns(Promise.resolve());
		start();

		emitter.emit('all', 'foo');
		return debounce().then(function () {
			t.ok(logger.reset.notCalled);
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
		api.run.returns(Promise.resolve());
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

	return Promise.all(pending);
});
