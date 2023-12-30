import test, { registerCompletionHandler } from 'ava'

registerCompletionHandler(() => {
	console.error('one')
})

test('pass', t => {
	t.pass()
})
