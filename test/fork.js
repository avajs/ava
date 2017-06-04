'use strict';
const path = require('path');
const test = require('tap').test;
const _fork = require('../lib/fork.js');
const CachingPrecompiler = require('../lib/caching-precompiler');

const cacheDir = path.join(__dirname, '../node_modules/.cache/ava');
const precompiler = new CachingPrecompiler({
	babelCacheKeys: {},
	getBabelOptions() {
		return {
			babelrc: false,
			presets: [require.resolve('@ava/babel-preset-stage-4')]
		};
	},
	path: cacheDir
});

function fork(testPath, options) {
	const hash = precompiler.precompileFile(testPath);
	const precompiled = {};
	precompiled[testPath] = hash;

	return _fork(testPath, Object.assign({
		cacheDir,
		precompiled
	}, options));
}

function fixture(name) {
	return path.join(__dirname, 'fixture', name);
}

test('emits test event', t => {
	t.plan(1);

	fork(fixture('generators.js'))
		.run({})
		.on('test', tt => {
			t.is(tt.title, 'generator function');
			t.end();
		});
});

test('resolves promise with tests info', t => {
	t.plan(3);

	const file = fixture('generators.js');

	return fork(file)
		.run({})
		.then(info => {
			t.is(info.stats.passCount, 1);
			t.is(info.tests.length, 1);
			t.is(info.file, path.relative('.', file));
			t.end();
		});
});

test('exit after tests are finished', t => {
	t.plan(2);

	const start = Date.now();
	let cleanupCompleted = false;

	fork(fixture('slow-exit.js'))
		.run({})
		.on('exit', () => {
			t.true(Date.now() - start < 10000, 'test waited for a pending setTimeout');
			t.true(cleanupCompleted, 'cleanup did not complete');
		})
		.on('cleanup-completed', event => {
			cleanupCompleted = event.completed;
		});
});

test('rejects promise if the process exits with a non-zero code', t => {
	return fork(fixture('immediate-3-exit.js'))
		.catch(err => {
			t.is(err.name, 'AvaError');
			t.is(err.message, path.join('test', 'fixture', 'immediate-3-exit.js') + ' exited with a non-zero exit code: 3');
		});
});

test('rejects promise if the process exits without results', t => {
	return fork(fixture('immediate-0-exit.js'))
		.catch(err => {
			t.is(err.name, 'AvaError');
			t.is(err.message, 'Test results were not received from ' + path.join('test', 'fixture', 'immediate-0-exit.js'));
		});
});

test('rejects promise if the process is killed', t => {
	const forked = fork(fixture('es2015.js'));
	return forked
		.on('stats', function () {
			this.kill('SIGKILL');
		})
		.catch(err => {
			t.is(err.name, 'AvaError');
			t.is(err.message, path.join('test', 'fixture', 'es2015.js') + ' exited due to SIGKILL');
		});
});

test('fake timers do not break duration', t => {
	return fork(fixture('fake-timers.js'))
		.run({})
		.then(info => {
			const duration = info.tests[0].duration;
			t.true(duration < 1000, `${duration} < 1000`);
			t.is(info.stats.failCount, 0);
			t.is(info.stats.passCount, 1);
			t.end();
		});
});

/* ignore
test('destructuring of `t` is allowed', t => {
	fork(fixture('destructuring-public-api.js'))
		.run({})
		.then(info => {
			t.is(info.stats.failCount, 0);
			t.is(info.stats.passCount, 3);
			t.end();
		});
});
*/

test('babelrc is ignored', t => {
	return fork(fixture('babelrc/test.js'))
		.run({})
		.then(info => {
			t.is(info.stats.passCount, 1);
			t.end();
		});
});
