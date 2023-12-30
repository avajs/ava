import test, { registerCompletionHandler } from 'ava'

registerCompletionHandler(() => {
	process.exit(0)
})

test('pass', t => t.pass())
