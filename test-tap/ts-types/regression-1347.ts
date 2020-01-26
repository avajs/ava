import test from '../..'

test.cb('test', t => {
	const err = t.throws((): void => {throw new Error()})
	t.end()
})
