'use strict';
var test = require('tap').test;
var Promise = require('bluebird');
var Concurrent = require('../lib/concurrent');

function pass(val) {
	return {
		run: function () {
			return {
				passed: true,
				result: val
			};
		}
	};
}

function fail(val) {
	return {
		run: function () {
			return {
				passed: false,
				reason: val
			};
		}
	};
}

function passAsync(val) {
	return {
		run: function () {
			return Promise.resolve({
				passed: true,
				result: val
			});
		}
	};
}

function failAsync(err) {
	return {
		run: function () {
			return Promise.resolve({
				passed: false,
				reason: err
			});
		}
	};
}

function reject(err) {
	return {
		run: function () {
			return Promise.reject(err);
		}
	};
}

test('all sync - all pass - no bail', function (t) {
	var result = new Concurrent(
		[
			pass('a'),
			pass('b'),
			pass('c')
		],
		false
	).run();

	t.same(result, {
		passed: true,
		reason: null,
		result: [
			{passed: true, result: 'a'},
			{passed: true, result: 'b'},
			{passed: true, result: 'c'}
		]
	});
	t.end();
});

test('all sync - no failure - bail', function (t) {
	var result = new Concurrent(
		[
			pass('a'),
			pass('b'),
			pass('c')
		],
		true
	).run();

	t.same(result, {
		passed: true,
		reason: null,
		result: [
			{passed: true, result: 'a'},
			{passed: true, result: 'b'},
			{passed: true, result: 'c'}
		]
	});
	t.end();
});

test('all sync - begin failure - no bail', function (t) {
	var result = new Concurrent(
		[
			fail('a'),
			pass('b'),
			pass('c')
		],
		false
	).run();

	t.same(result, {
		passed: false,
		reason: 'a',
		result: [
			{passed: false, reason: 'a'},
			{passed: true, result: 'b'},
			{passed: true, result: 'c'}
		]
	});
	t.end();
});

test('all sync - mid failure - no bail', function (t) {
	var result = new Concurrent(
		[
			pass('a'),
			fail('b'),
			pass('c')
		],
		false
	).run();

	t.same(result, {
		passed: false,
		reason: 'b',
		result: [
			{passed: true, result: 'a'},
			{passed: false, reason: 'b'},
			{passed: true, result: 'c'}
		]
	});
	t.end();
});

test('all sync - end failure - no bail', function (t) {
	var result = new Concurrent(
		[
			pass('a'),
			pass('b'),
			fail('c')
		],
		false
	).run();

	t.same(result, {
		passed: false,
		reason: 'c',
		result: [
			{passed: true, result: 'a'},
			{passed: true, result: 'b'},
			{passed: false, reason: 'c'}
		]
	});
	t.end();
});

test('all sync - multiple failure - no bail', function (t) {
	var result = new Concurrent(
		[
			fail('a'),
			pass('b'),
			fail('c')
		],
		false
	).run();

	t.same(result, {
		passed: false,
		reason: 'a',
		result: [
			{passed: false, reason: 'a'},
			{passed: true, result: 'b'},
			{passed: false, reason: 'c'}
		]
	});
	t.end();
});

test('all sync - begin failure - bail', function (t) {
	var result = new Concurrent(
		[
			fail('a'),
			pass('b'),
			pass('c')
		],
		true
	).run();

	t.same(result, {
		passed: false,
		reason: 'a',
		result: [
			{passed: false, reason: 'a'}
		]
	});
	t.end();
});

test('all sync - mid failure - bail', function (t) {
	var result = new Concurrent(
		[
			pass('a'),
			fail('b'),
			pass('c')
		],
		true
	).run();

	t.same(result, {
		passed: false,
		reason: 'b',
		result: [
			{passed: true, result: 'a'},
			{passed: false, reason: 'b'}
		]
	});
	t.end();
});

test('all sync - end failure - bail', function (t) {
	var result = new Concurrent(
		[
			pass('a'),
			pass('b'),
			fail('c')
		],
		true
	).run();

	t.same(result, {
		passed: false,
		reason: 'c',
		result: [
			{passed: true, result: 'a'},
			{passed: true, result: 'b'},
			{passed: false, reason: 'c'}
		]
	});
	t.end();
});

test('all async - no failure - no bail', function (t) {
	new Concurrent(
		[
			passAsync('a'),
			passAsync('b'),
			passAsync('c')
		],
		false
	).run().then(function (result) {
		t.same(result, {
			passed: true,
			reason: null,
			result: [
				{passed: true, result: 'a'},
				{passed: true, result: 'b'},
				{passed: true, result: 'c'}
			]
		});
		t.end();
	});
});

test('all async - no failure - bail', function (t) {
	new Concurrent(
		[
			passAsync('a'),
			passAsync('b'),
			passAsync('c')
		],
		true
	).run().then(function (result) {
		t.same(result, {
			passed: true,
			reason: null,
			result: [
				{passed: true, result: 'a'},
				{passed: true, result: 'b'},
				{passed: true, result: 'c'}
			]
		});
		t.end();
	});
});

test('last async - no failure - no bail', function (t) {
	new Concurrent(
		[
			pass('a'),
			pass('b'),
			passAsync('c')
		],
		false
	).run().then(function (result) {
		t.same(result, {
			passed: true,
			reason: null,
			result: [
				{passed: true, result: 'a'},
				{passed: true, result: 'b'},
				{passed: true, result: 'c'}
			]
		});
		t.end();
	});
});

test('mid async - no failure - no bail', function (t) {
	new Concurrent(
		[
			pass('a'),
			passAsync('b'),
			pass('c')
		],
		false
	).run().then(function (result) {
		t.same(result, {
			passed: true,
			reason: null,
			result: [
				{passed: true, result: 'a'},
				{passed: true, result: 'b'},
				{passed: true, result: 'c'}
			]
		});
		t.end();
	});
});

test('first async - no failure - no bail', function (t) {
	new Concurrent(
		[
			passAsync('a'),
			pass('b'),
			pass('c')
		],
		false
	).run().then(function (result) {
		t.same(result, {
			passed: true,
			reason: null,
			result: [
				{passed: true, result: 'a'},
				{passed: true, result: 'b'},
				{passed: true, result: 'c'}
			]
		});
		t.end();
	});
});

test('last async - no failure - bail', function (t) {
	new Concurrent(
		[
			pass('a'),
			pass('b'),
			passAsync('c')
		],
		true
	).run().then(function (result) {
		t.same(result, {
			passed: true,
			reason: null,
			result: [
				{passed: true, result: 'a'},
				{passed: true, result: 'b'},
				{passed: true, result: 'c'}
			]
		});
		t.end();
	});
});

test('mid async - no failure - bail', function (t) {
	new Concurrent(
		[
			pass('a'),
			passAsync('b'),
			pass('c')
		],
		true
	).run().then(function (result) {
		t.same(result, {
			passed: true,
			reason: null,
			result: [
				{passed: true, result: 'a'},
				{passed: true, result: 'b'},
				{passed: true, result: 'c'}
			]
		});
		t.end();
	});
});

test('first async - no failure - bail', function (t) {
	new Concurrent(
		[
			passAsync('a'),
			pass('b'),
			pass('c')
		],
		true
	).run().then(function (result) {
		t.same(result, {
			passed: true,
			reason: null,
			result: [
				{passed: true, result: 'a'},
				{passed: true, result: 'b'},
				{passed: true, result: 'c'}
			]
		});
		t.end();
	});
});

test('all async - begin failure - bail', function (t) {
	new Concurrent(
		[
			failAsync('a'),
			passAsync('b'),
			passAsync('c')
		],
		true
	).run().then(function (result) {
		t.same(result, {
			passed: false,
			reason: 'a',
			result: [
				{passed: false, reason: 'a'}
			]
		});
		t.end();
	});
});

test('all async - mid failure - bail', function (t) {
	new Concurrent(
		[
			passAsync('a'),
			failAsync('b'),
			passAsync('c')
		],
		true
	).run().then(function (result) {
		t.same(result, {
			passed: false,
			reason: 'b',
			result: [
				{passed: true, result: 'a'},
				{passed: false, reason: 'b'}
			]
		});
		t.end();
	});
});

test('all async - end failure - bail', function (t) {
	new Concurrent(
		[
			passAsync('a'),
			passAsync('b'),
			failAsync('c')
		],
		true
	).run().then(function (result) {
		t.same(result, {
			passed: false,
			reason: 'c',
			result: [
				{passed: true, result: 'a'},
				{passed: true, result: 'b'},
				{passed: false, reason: 'c'}
			]
		});
		t.end();
	});
});

test('all async - begin failure - no bail', function (t) {
	new Concurrent(
		[
			failAsync('a'),
			passAsync('b'),
			passAsync('c')
		],
		false
	).run().then(function (result) {
		t.same(result, {
			passed: false,
			reason: 'a',
			result: [
				{passed: false, reason: 'a'},
				{passed: true, result: 'b'},
				{passed: true, result: 'c'}
			]
		});
		t.end();
	});
});

test('all async - mid failure - no bail', function (t) {
	new Concurrent(
		[
			passAsync('a'),
			failAsync('b'),
			passAsync('c')
		],
		false
	).run().then(function (result) {
		t.same(result, {
			passed: false,
			reason: 'b',
			result: [
				{passed: true, result: 'a'},
				{passed: false, reason: 'b'},
				{passed: true, result: 'c'}
			]
		});
		t.end();
	});
});

test('all async - end failure - no bail', function (t) {
	new Concurrent(
		[
			passAsync('a'),
			passAsync('b'),
			failAsync('c')
		],
		false
	).run().then(function (result) {
		t.same(result, {
			passed: false,
			reason: 'c',
			result: [
				{passed: true, result: 'a'},
				{passed: true, result: 'b'},
				{passed: false, reason: 'c'}
			]
		});
		t.end();
	});
});

test('all async - multiple failure - no bail', function (t) {
	new Concurrent(
		[
			failAsync('a'),
			passAsync('b'),
			failAsync('c')
		],
		false
	).run().then(function (result) {
		t.same(result, {
			passed: false,
			reason: 'a',
			result: [
				{passed: false, reason: 'a'},
				{passed: true, result: 'b'},
				{passed: false, reason: 'c'}
			]
		});
		t.end();
	});
});

test('rejections are just passed through - no bail', function (t) {
	new Concurrent(
		[
			pass('a'),
			pass('b'),
			reject('foo')
		],
		false
	).run().catch(function (reason) {
		t.is(reason, 'foo');
		t.end();
	});
});

test('rejections are just passed through - bail', function (t) {
	new Concurrent(
		[
			pass('a'),
			pass('b'),
			reject('foo')
		],
		true
	).run().catch(function (reason) {
		t.is(reason, 'foo');
		t.end();
	});
});

test('must be called with new', function (t) {
	t.throws(function () {
		var concurrent = Concurrent;
		concurrent([pass('a')]);
	}, {message: 'Class constructor Concurrent cannot be invoked without \'new\''});
	t.end();
});

test('sequences of sequences', function (t) {
	var result = new Concurrent([
		new Concurrent([pass('a'), pass('b')]),
		new Concurrent([pass('c')])
	]).run();

	t.same(result, {
		passed: true,
		reason: null,
		result: [
			{
				passed: true,
				reason: null,
				result: [
					{passed: true, result: 'a'},
					{passed: true, result: 'b'}
				]
			},
			{
				passed: true,
				reason: null,
				result: [
					{passed: true, result: 'c'}
				]
			}
		]
	});

	t.end();
});
