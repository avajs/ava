'use strict';
const tap = require('tap');
const isPromise = require('is-promise');
const Concurrent = require('../lib/concurrent');

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

function failWithTypeError() {
	return {
		run() {
			throw new TypeError('Unexpected Error');
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

test('all sync - all pass - no bail', t => {
	const passed = new Concurrent(
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
	const passed = new Concurrent(
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
	const passed = new Concurrent(
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
	const passed = new Concurrent(
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

test('all sync - end failure - no bail', t => {
	const passed = new Concurrent(
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
	const passed = new Concurrent(
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
	const passed = new Concurrent(
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
	const passed = new Concurrent(
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
	const passed = new Concurrent(
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
	return new Concurrent(
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
	});
});

test('all async - no failure - bail', t => {
	return new Concurrent(
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
	});
});

test('last async - no failure - no bail', t => {
	return new Concurrent(
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
	});
});

test('mid async - no failure - no bail', t => {
	return new Concurrent(
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
				result: 'c'
			},
			{
				passed: true,
				result: 'b'
			}
		]);
	});
});

test('first async - no failure - no bail', t => {
	return new Concurrent(
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
				result: 'b'
			},
			{
				passed: true,
				result: 'c'
			},
			{
				passed: true,
				result: 'a'
			}
		]);
	});
});

test('last async - no failure - bail', t => {
	return new Concurrent(
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
	});
});

test('mid async - no failure - bail', t => {
	return new Concurrent(
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
				result: 'c'
			},
			{
				passed: true,
				result: 'b'
			}
		]);
	});
});

test('first async - no failure - bail', t => {
	return new Concurrent(
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
				result: 'b'
			},
			{
				passed: true,
				result: 'c'
			},
			{
				passed: true,
				result: 'a'
			}
		]);
	});
});

test('all async - begin failure - bail', t => {
	return new Concurrent(
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
	});
});

test('all async - mid failure - bail', t => {
	return new Concurrent(
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
			},
			{
				passed: true,
				result: 'c'
			}
		]);
	});
});

test('all async - end failure - bail', t => {
	return new Concurrent(
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
	});
});

test('all async - begin failure - no bail', t => {
	return new Concurrent(
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
	});
});

test('all async - mid failure - no bail', t => {
	return new Concurrent(
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
	});
});

test('all async - end failure - no bail', t => {
	return new Concurrent(
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
	});
});

test('all async - multiple failure - no bail', t => {
	return new Concurrent(
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
	});
});

test('rejections are just passed through - no bail', t => {
	return new Concurrent(
		[
			pass('a'),
			pass('b'),
			reject('foo')
		],
		false
	).run().catch(err => {
		t.is(err, 'foo');
	});
});

test('rejections are just passed through - bail', t => {
	return new Concurrent(
		[
			pass('a'),
			pass('b'),
			reject('foo')
		],
		true
	).run().catch(err => {
		t.is(err, 'foo');
	});
});

test('sequences of sequences', t => {
	const passed = new Concurrent([
		new Concurrent([pass('a'), pass('b')]),
		new Concurrent([pass('c')])
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

test('must be called with array of runnables', t => {
	t.throws(() => {
		new Concurrent(pass('a')).run();
	}, {message: 'Expected an array of runnables'});
	t.end();
});

test('should throw an error then test.run() fails with not AvaError', t => {
	t.throws(() => {
		new Concurrent([failWithTypeError()]).run();
	}, {message: 'Unexpected Error'});
	t.end();
});
