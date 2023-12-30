import test, { registerCompletionHandler } from 'ava'

registerCompletionHandler(() => {
	console.error('one')
})
registerCompletionHandler(() => {
	console.error('two')
})

test('pass', t => t.pass())
