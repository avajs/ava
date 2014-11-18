'use strict';
var assert = require('assert');
// TODO: dogfood when ava is stable?
var test = require('tape');
var test2 = require('../lib/test');

// TODO: lots of more tests

test('run test', function (t) {
	test2('foo', function (t2) {
		t2.true(false);
		t2.end();
	}).run(function (err) {
		t.true(err);
		t.end();
	});
});

test('optional test title', function (t) {
	test2(function (t2) {
		t2.end();
	}).run(function () {
		t.equal(this.title, '[anonymous]');
		t.end();
	});
});

test('infer test name from function', function (t) {
	test2(function foo(t2) {
		t2.end();
	}).run(function () {
		t.equal(this.title, 'foo');
		t.end();
	});
});

test('multiple asserts', function (t) {
	test2(function (t2) {
		t2.true(true);
		t2.true(false);
		t2.true(true);
		t2.end();
	}).run(function (err) {
		t.true(err);
		t.end();
	});
});

test('plan assertions', function (t) {
	test2(function (t2) {
		t2.plan(2)
		t2.true(true);
		t2.true(true);
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('plan assertions 2', function (t) {
	test2(function (t2) {
		t2.plan(2)
		t2.true(true);
		t2.true(true);
	}).run(function (err) {
		t.notOk(err);
		t.end();
	});
});

test('plan assertions 3', function (t) {
	test2(function (t2) {
		t2.plan(2)
		t2.true(false);
		t2.true(false);
	}).run(function (err) {
		t.true(err);
		t.end();
	});
});

test('plan assertions - more than planned', function (t) {
	test2(function foo(t2) {
		t2.plan(2)
		t2.true(false);
		t2.true(false);
		t2.true(false);
	}).run(function (err) {
		t.equal(err.name, 'AssertionError');
		t.end();
	});
});

test('handle non-assertion errors', function (t) {
	test2(function (t2) {
		throw new Error;
		t2.end();
	}).run(function (err) {
		t.equal(err.name, 'AssertionError');
		t.true(err.actual instanceof Error);
		t.end();
	});
});
