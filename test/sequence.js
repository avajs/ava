'use strict';
const tap = require('tap');
const Promise = require('bluebird');
const isPromise = require('is-promise');
const Sequence = require('../lib/sequence');

let results = [];
const test = (name, fn) => {
	tap.test(name, t => {
		results = [];
		return fn(t);
	});
};
function collect(result) {
	if (isPromise(result)) {
		return result.then(collect);
	}

	results.push(result);
	return result.passed;
}

function pass(val) {
	return {
		run() {
			return collect({
				passed: true,
				result: val
			});
		}
	};
}

function fail(val) {
	return {
		run() {
			return collect({
				passed: false,
				reason: val
			});
		}
	};
}

function passAsync(val) {
	return {
		run() {
			return collect(Promise.resolve({
				passed: true,
				result: val
			}));
		}
	};
}

function failAsync(err) {
	return {
		run() {
			return collect(Promise.resolve({
				passed: false,
				reason: err
			}));
		}
	};
}

function reject(err) {
	return {
		run() {
			return Promise.reject(err);
		}
	};
}

test('all sync - no failure - no bail', t => {
	const passed = new Sequence(
		[
			pass('a'),
			pass('b'),
			pass('c')
		],
		false
	).run();

	t.equal(passed, true);
	t.strictDeepEqual(results, [
		{
			passed: true,
			result: 'a'
		},
		{
			passed: true,
			result: 'b'
		},
		{
			passed: true,
			result: 'c'
		}
	]);
	t.end();
});

test('all sync - no failure - bail', t => {
	const passed = new Sequence(
		[
			pass('a'),
			pass('b'),
			pass('c')
		],
		true
	).run();

	t.equal(passed, true);
	t.strictDeepEqual(results, [
		{
			passed: true,
			result: 'a'
		},
		{
			passed: true,
			result: 'b'
		},
		{
			passed: true,
			result: 'c'
		}
	]);
	t.end();
});

test('all sync - begin failure - no bail', t => {
	const passed = new Sequence(
		[
			fail('a'),
			pass('b'),
			pass('c')
		],
		false
	).run();

	t.equal(passed, false);
	t.strictDeepEqual(results, [
		{
			passed: false,
			reason: 'a'
		},
		{
			passed: true,
			result: 'b'
		},
		{
			passed: true,
			result: 'c'
		}
	]);
	t.end();
});

test('all sync - mid failure - no bail', t => {
	const passed = new Sequence(
		[
			pass('a'),
			fail('b'),
			pass('c')
		],
		false
	).run();

	t.equal(passed, false);
	t.strictDeepEqual(results, [
		{
			passed: true,
			result: 'a'},
		{
			passed: false,
			reason: 'b'
		},
		{
			passed: true,
			result: 'c'
		}
	]);
	t.end();
});

test('all sync - end failure - no bail', t => {
	const passed = new Sequence(
		[
			pass('a'),
			pass('b'),
			fail('c')
		],
		false
	).run();

	t.equal(passed, false);
	t.strictDeepEqual(results, [
		{
			passed: true,
			result: 'a'
		},
		{
			passed: true,
			result: 'b'
		},
		{
			passed: false,
			reason: 'c'
		}
	]);
	t.end();
});

test('all sync - multiple failure - no bail', t => {
	const passed = new Sequence(
		[
			fail('a'),
			pass('b'),
			fail('c')
		],
		false
	).run();

	t.equal(passed, false);
	t.strictDeepEqual(results, [
		{
			passed: false,
			reason: 'a'
		},
		{
			passed: true,
			result: 'b'
		},
		{
			passed: false,
			reason: 'c'
		}
	]);
	t.end();
});

test('all sync - begin failure - bail', t => {
	const passed = new Sequence(
		[
			fail('a'),
			pass('b'),
			pass('c')
		],
		true
	).run();

	t.equal(passed, false);
	t.strictDeepEqual(results, [
		{
			passed: false,
			reason: 'a'
		}
	]);
	t.end();
});

test('all sync - mid failure - bail', t => {
	const passed = new Sequence(
		[
			pass('a'),
			fail('b'),
			pass('c')
		],
		true
	).run();

	t.equal(passed, false);
	t.strictDeepEqual(results, [
		{
			passed: true,
			result: 'a'
		},
		{
			passed: false,
			reason: 'b'
		}
	]);
	t.end();
});

test('all sync - end failure - bail', t => {
	const passed = new Sequence(
		[
			pass('a'),
			pass('b'),
			fail('c')
		],
		true
	).run();

	t.equal(passed, false);
	t.strictDeepEqual(results, [
		{
			passed: true,
			result: 'a'
		},
		{
			passed: true,
			result: 'b'
		},
		{
			passed: false,
			reason: 'c'
		}
	]);
	t.end();
});

test('all async - no failure - no bail', t => {
	new Sequence(
		[
			passAsync('a'),
			passAsync('b'),
			passAsync('c')
		],
		false
	).run().then(passed => {
		t.equal(passed, true);
		t.strictDeepEqual(results, [
			{
				passed: true,
				result: 'a'
			},
			{
				passed: true,
				result: 'b'
			},
			{
				passed: true,
				result: 'c'
			}
		]);
		t.end();
	});
});

test('all async - no failure - bail', t => {
	new Sequence(
		[
			passAsync('a'),
			passAsync('b'),
			passAsync('c')
		],
		true
	).run().then(passed => {
		t.equal(passed, true);
		t.strictDeepEqual(results, [
			{
				passed: true,
				result: 'a'
			},
			{
				passed: true,
				result: 'b'
			},
			{
				passed: true,
				result: 'c'
			}
		]);
		t.end();
	});
});

test('last async - no failure - no bail', t => {
	new Sequence(
		[
			pass('a'),
			pass('b'),
			passAsync('c')
		],
		false
	).run().then(passed => {
		t.equal(passed, true);
		t.strictDeepEqual(results, [
			{
				passed: true,
				result: 'a'
			},
			{
				passed: true,
				result: 'b'
			},
			{
				passed: true,
				result: 'c'
			}
		]);
		t.end();
	});
});

test('mid async - no failure - no bail', t => {
	new Sequence(
		[
			pass('a'),
			passAsync('b'),
			pass('c')
		],
		false
	).run().then(passed => {
		t.equal(passed, true);
		t.strictDeepEqual(results, [
			{
				passed: true,
				result: 'a'
			},
			{
				passed: true,
				result: 'b'
			},
			{
				passed: true,
				result: 'c'
			}
		]);
		t.end();
	});
});

test('first async - no failure - no bail', t => {
	new Sequence(
		[
			passAsync('a'),
			pass('b'),
			pass('c')
		],
		false
	).run().then(passed => {
		t.equal(passed, true);
		t.strictDeepEqual(results, [
			{
				passed: true,
				result: 'a'
			},
			{
				passed: true,
				result: 'b'
			},
			{
				passed: true,
				result: 'c'
			}
		]);
		t.end();
	});
});

test('last async - no failure - bail', t => {
	new Sequence(
		[
			pass('a'),
			pass('b'),
			passAsync('c')
		],
		true
	).run().then(passed => {
		t.equal(passed, true);
		t.strictDeepEqual(results, [
			{
				passed: true,
				result: 'a'
			},
			{
				passed: true,
				result: 'b'
			},
			{
				passed: true,
				result: 'c'
			}
		]);
		t.end();
	});
});

test('mid async - no failure - bail', t => {
	new Sequence(
		[
			pass('a'),
			passAsync('b'),
			pass('c')
		],
		true
	).run().then(passed => {
		t.equal(passed, true);
		t.strictDeepEqual(results, [
			{
				passed: true,
				result: 'a'
			},
			{
				passed: true,
				result: 'b'
			},
			{
				passed: true,
				result: 'c'
			}
		]);
		t.end();
	});
});

test('first async - no failure - bail', t => {
	new Sequence(
		[
			passAsync('a'),
			pass('b'),
			pass('c')
		],
		true
	).run().then(passed => {
		t.equal(passed, true);
		t.strictDeepEqual(results, [
			{
				passed: true,
				result: 'a'
			},
			{
				passed: true,
				result: 'b'
			},
			{
				passed: true,
				result: 'c'
			}
		]);
		t.end();
	});
});

test('all async - begin failure - bail', t => {
	new Sequence(
		[
			failAsync('a'),
			passAsync('b'),
			passAsync('c')
		],
		true
	).run().then(passed => {
		t.equal(passed, false);
		t.strictDeepEqual(results, [
			{
				passed: false,
				reason: 'a'
			}
		]);
		t.end();
	});
});

test('all async - mid failure - bail', t => {
	new Sequence(
		[
			passAsync('a'),
			failAsync('b'),
			passAsync('c')
		],
		true
	).run().then(passed => {
		t.equal(passed, false);
		t.strictDeepEqual(results, [
			{
				passed: true,
				result: 'a'
			},
			{
				passed: false,
				reason: 'b'
			}
		]);
		t.end();
	});
});

test('all async - end failure - bail', t => {
	new Sequence(
		[
			passAsync('a'),
			passAsync('b'),
			failAsync('c')
		],
		true
	).run().then(passed => {
		t.equal(passed, false);
		t.strictDeepEqual(results, [
			{
				passed: true,
				result: 'a'
			},
			{
				passed: true,
				result: 'b'
			},
			{
				passed: false,
				reason: 'c'
			}
		]);
		t.end();
	});
});

test('all async - begin failure - no bail', t => {
	new Sequence(
		[
			failAsync('a'),
			passAsync('b'),
			passAsync('c')
		],
		false
	).run().then(passed => {
		t.equal(passed, false);
		t.strictDeepEqual(results, [
			{
				passed: false,
				reason: 'a'
			},
			{
				passed: true,
				result: 'b'
			},
			{
				passed: true,
				result: 'c'
			}
		]);
		t.end();
	});
});

test('all async - mid failure - no bail', t => {
	new Sequence(
		[
			passAsync('a'),
			failAsync('b'),
			passAsync('c')
		],
		false
	).run().then(passed => {
		t.equal(passed, false);
		t.strictDeepEqual(results, [
			{
				passed: true,
				result: 'a'
			},
			{
				passed: false,
				reason: 'b'
			},
			{
				passed: true,
				result: 'c'
			}
		]);
		t.end();
	});
});

test('all async - end failure - no bail', t => {
	new Sequence(
		[
			passAsync('a'),
			passAsync('b'),
			failAsync('c')
		],
		false
	).run().then(passed => {
		t.equal(passed, false);
		t.strictDeepEqual(results, [
			{
				passed: true,
				result: 'a'
			},
			{
				passed: true,
				result: 'b'
			},
			{
				passed: false,
				reason: 'c'
			}
		]);
		t.end();
	});
});

test('all async - multiple failure - no bail', t => {
	new Sequence(
		[
			failAsync('a'),
			passAsync('b'),
			failAsync('c')
		],
		false
	).run().then(passed => {
		t.equal(passed, false);
		t.strictDeepEqual(results, [
			{
				passed: false,
				reason: 'a'
			},
			{
				passed: true,
				result: 'b'
			},
			{
				passed: false,
				reason: 'c'
			}
		]);
		t.end();
	});
});

test('rejections are just passed through - no bail', t => {
	new Sequence(
		[
			pass('a'),
			pass('b'),
			reject('foo')
		],
		false
	).run().catch(err => {
		t.is(err, 'foo');
		t.end();
	});
});

test('rejections are just passed through - bail', t => {
	new Sequence(
		[
			pass('a'),
			pass('b'),
			reject('foo')
		],
		true
	).run().catch(err => {
		t.is(err, 'foo');
		t.end();
	});
});

test('needs at least one sequence runnable', t => {
	t.throws(() => {
		new Sequence().run();
	}, {message: 'Expected an array of runnables'});
	t.end();
});

test('sequences of sequences', t => {
	const passed = new Sequence([
		new Sequence([pass('a'), pass('b')]),
		new Sequence([pass('c')])
	]).run();

	t.equal(passed, true);
	t.strictDeepEqual(results, [
		{
			passed: true,
			result: 'a'
		},
		{
			passed: true,
			result: 'b'
		},
		{
			passed: true,
			result: 'c'
		}
	]);

	t.end();
});
