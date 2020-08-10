const test = require('@ava/test');
const exec = require('../helpers/exec');

test('bails when --concurrency is provided without value', async t => {
	await t.throwsAsync(exec.fixture(['--concurrency', 'concurrency.js']), {
		message: /The --concurrency or -c flag must be provided with a nonnegative integer./
	});
});

test('bails when --concurrency is provided with an input that is a string', async t => {
	return t.throwsAsync(exec.fixture(['--concurrency=foo', 'concurrency.js']), {
		message: /The --concurrency or -c flag must be provided with a nonnegative integer./
	});
});

test('bails when --concurrency is provided with an input that is a float', async t => {
	return t.throwsAsync(exec.fixture(['--concurrency=4.7', 'concurrency.js']), {
		message: /The --concurrency or -c flag must be provided with a nonnegative integer./
	});
});

test('bails when --concurrency is provided with an input that is negative', async t => {
	return t.throwsAsync(exec.fixture(['--concurrency=-1', 'concurrency.js']), {
		message: /The --concurrency or -c flag must be provided with a nonnegative integer./
	});
});

test('works when --concurrency is provided with a value', async t => {
	return t.notThrowsAsync(exec.fixture(['--concurrency=1', 'concurrency.js']));
});
