const {isMainThread} = require('worker_threads')
const test = require('ava');

test('in worker thread', t => {
	t.false(isMainThread)
})
