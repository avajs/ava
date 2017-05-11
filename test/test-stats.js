var test = require('tap').test;
var TestStats = require('../lib/test-stats');
var testStats = TestStats;

test('must be called with new', function (t) {
	t.throws(function () {
		testStats({files: ['foo.js']});
	}, /TestStats cannot be invoked without 'new'/);

	t.end();
});

test('calling `test` increases the passCount', function (t) {
	var stats = new TestStats({files: ['foo.js']});

	t.is(stats.currentStatus().passCount, 0);

	stats.onTest({
		file: 'foo.js',
		title: '[anonymous]'
	});

	t.is(stats.currentStatus().passCount, 1);
	t.end();
});

test('calling `onTest` with a skipped method will add to the current skipCount', function (t) {
	var stats = new TestStats({files: ['foo.js']});

	t.is(stats.currentStatus().skipCount, 0);

	stats.onTest({
		file: 'foo.js',
		title: '[anonymous]',
		skip: true
	});

	t.is(stats.currentStatus().skipCount, 1);
	t.end();
});

test('calling `onTest` with a todo method will add to the current todoCount', function (t) {
	var stats = new TestStats({files: ['foo.js']});

	t.is(stats.currentStatus().todoCount, 0);

	stats.onTest({
		file: 'foo.js',
		title: '[anonymous]',
		todo: true
	});

	t.is(stats.currentStatus().todoCount, 1);
	t.end();
});

test('calling `onTest` with a test that has an Error increases the failCount', function (t) {
	var stats = new TestStats({files: ['foo.js']});

	t.is(stats.currentStatus().failCount, 0);

	stats.onTest({
		file: 'foo.js',
		title: '[anonymous]',
		error: {
			message: 'bad things happened',
			stack: 'bad stack'
		}
	});

	t.is(stats.currentStatus().failCount, 1);
	t.end();
});

test('calling `onTest` with a test that has an Error increases the failCount', function (t) {
	var stats = new TestStats({files: ['foo.js']});

	t.is(stats.currentStatus().failCount, 0);

	stats.onTest({
		file: 'foo.js',
		title: '[anonymous]',
		error: {
			message: 'bad things happened',
			stack: 'bad stack'
		}
	});

	t.is(stats.currentStatus().failCount, 1);
	t.end();
});

test('calling `onTest` with a test that has an Error adds to the `errors` array', function (t) {
	var stats = new TestStats({files: ['foo.js']});

	t.same(stats.currentStatus().errors, []);

	stats.onTest({
		file: 'foo.js',
		title: '[anonymous]',
		error: {
			message: 'bad things happened',
			stack: 'bad stack'
		}
	});

	t.same(stats.currentStatus().errors, [
		{
			file: 'foo.js',
			title: '[anonymous]',
			error: {
				message: 'bad things happened',
				stack: 'bad stack'
			}
		}
	]);

	t.end();
});

test('skipCount from previous run will be included in previousStatus', function (t) {
	var stats1 = new TestStats({
		files: ['foo.js', 'bar.js']
	});

	stats1.onTest({
		file: 'foo.js',
		title: 'foo 1',
		skip: true
	});

	stats1.onTest({
		file: 'foo.js',
		title: 'foo 2',
		skip: true
	});

	stats1.onTest({
		file: 'bar.js',
		title: 'bar 2',
		skip: true
	});

	var stats2 = new TestStats({
		files: ['bar.js'],
		previousFiles: ['foo.js'],
		previousStats: stats1
	});

	t.is(stats2.previousStatus().skipCount, 2);

	var stats3 = new TestStats({
		files: ['foo.js'],
		previousFiles: ['bar.js'],
		previousStats: stats1
	});

	t.is(stats3.previousStatus().skipCount, 1);

	t.end();
});

test('todoCount from previous run will be included in previousStatus', function (t) {
	var stats1 = new TestStats({
		files: ['foo.js', 'bar.js']
	});

	stats1.onTest({
		file: 'foo.js',
		title: 'foo 1',
		todo: true
	});

	stats1.onTest({
		file: 'foo.js',
		title: 'foo 2',
		todo: true
	});

	stats1.onTest({
		file: 'bar.js',
		title: 'bar 2',
		todo: true
	});

	var stats2 = new TestStats({
		files: ['bar.js'],
		previousFiles: ['foo.js'],
		previousStats: stats1
	});

	t.is(stats2.previousStatus().todoCount, 2);

	var stats3 = new TestStats({
		files: ['foo.js'],
		previousFiles: ['bar.js'],
		previousStats: stats1
	});

	t.is(stats3.previousStatus().todoCount, 1);

	t.end();
});

test('passCount from previous run will be included in previousStatus', function (t) {
	var stats1 = new TestStats({
		files: ['foo.js', 'bar.js']
	});

	stats1.onTest({
		file: 'foo.js',
		title: 'foo 1'
	});

	stats1.onTest({
		file: 'foo.js',
		title: 'foo 2'
	});

	stats1.onTest({
		file: 'bar.js',
		title: 'bar 2'
	});

	var stats2 = new TestStats({
		files: ['bar.js'],
		previousFiles: ['foo.js'],
		previousStats: stats1
	});

	t.is(stats2.previousStatus().passCount, 2);

	var stats3 = new TestStats({
		files: ['foo.js'],
		previousFiles: ['bar.js'],
		previousStats: stats1
	});

	t.is(stats3.previousStatus().passCount, 1);

	t.end();
});

test('previous Errors will be copied to the new status object', function (t) {
	var stats1 = new TestStats({
		files: ['foo.js', 'bar.js']
	});

	stats1.onTest({
		file: 'foo.js',
		title: 'foo 1',
		error: {
			message: 'fail - foo 1',
			stack: 'stack foo 1'
		}
	});

	stats1.onTest({
		file: 'foo.js',
		title: 'foo 2',
		error: {
			message: 'fail - foo 2',
			stack: 'stack foo 2'
		}
	});

	stats1.onTest({
		file: 'bar.js',
		title: 'bar 1',
		error: {
			message: 'fail - bar 1',
			stack: 'stack bar 1'
		}
	});

	var stats2 = new TestStats({
		files: ['bar.js'],
		previousFiles: ['foo.js'],
		previousStats: stats1
	});

	t.same(stats2.previousStatus().errors, [
		{
			file: 'foo.js',
			title: 'foo 1',
			error: {
				message: 'fail - foo 1',
				stack: 'stack foo 1'
			}
		},
		{
			file: 'foo.js',
			title: 'foo 2',
			error: {
				message: 'fail - foo 2',
				stack: 'stack foo 2'
			}
		}
	]);

	stats2.onTest({
		file: 'bar.js',
		title: 'bar 1',
		error: {
			message: 'fail - bar 1.2',
			stack: 'stack bar 1.2'
		}
	});

	var stats3 = new TestStats({
		files: ['baz.js'],
		previousFiles: ['foo.js', 'bar.js'],
		previousStats: stats2
	});

	t.same(stats3.previousStatus().errors, [
		{
			file: 'foo.js',
			title: 'foo 1',
			error: {
				message: 'fail - foo 1',
				stack: 'stack foo 1'
			}
		},
		{
			file: 'foo.js',
			title: 'foo 2',
			error: {
				message: 'fail - foo 2',
				stack: 'stack foo 2'
			}
		},
		{
			file: 'bar.js',
			title: 'bar 1',
			error: {
				message: 'fail - bar 1.2',
				stack: 'stack bar 1.2'
			}
		}
	]);

	t.end();
});
