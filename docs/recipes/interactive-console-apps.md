# Testing interactive terminal applications

## Using tty-test-helper

Install the [tty-test-helper](https://github.com/arve0/tty-test-helper).
```sh
npm install --save-dev tty-test-helper
```

Here is a console application which writes `.` on `stdin`:
```js
/**
 * Prints . for every keypress. Exits on Ctrl+C.
 */
const readline = require('readline')

/**
 * stdin is not TTY if forked from another node process.
 * TTYs needs to be in raw mode for `emitKeypressEvents` to work.
 */
if (process.stdin.isTTY) {
	process.stdin.setRawMode(true)
}
readline.emitKeypressEvents(process.stdin)

// listen for keypresses
process.stdin.on('keypress', (str, key) => {
	if (key.ctrl && key.name === 'c') {
		process.stdout.write('\n')
		process.exit()
	}
	process.stdout.write('.')
})

// print welcome message
console.log('Press any key to fill your terminal with... Ctrl+C will exit.')
```

The application above can be tested like this:

```js
const test = require('ava')
const ttyTestHelper = require('tty-test-helper')

/**
 * Will run before every test.
 * You may also use `test.serial` to test the terminal application in a serial
 * manner, keeping it alive for the whole session.
 */
test.beforeEach((t) => {
	const CMD = 'index.js'
	t.context = ttyTestHelper(__dirname + '/' + CMD)
})

test.afterEach((t) => {
	// terminate child after each test
	if (t.context.child.connected) {
		t.context.child.disconnect()
	}
})

/**
 * Run tests concurrently.
 */
test('gets a welcome message', async (t) => {
	const { waitFor } = t.context
	// return a Promise that resolves if 'Press any key' is found in stdout.
	return waitFor('Press any key')
})

test('any keypress gives . in terminal', async (t) => {
	const { next, stdin } = t.context
	// get initial output
	// default timeout is 1000 ms, which will throw and fail the test
	let output = await next()

  // start listening for next output
	output = next()
	// send a character
	stdin.write('a')
	// wait until we get the output
	output = await output
	// expect the output to be '.'
	t.true(output === '.')

	// do once more with another character
	output = next()
	stdin.write('1')
	output = await output
	t.true(output === '.')
})

test('Ctrl+C exits program', async (t) => {
	const { next, stdin, child } = t.context
	await next()

	let output = next()
	stdin.write('\x03')  // Ctrl+C
	output = await output
	t.true(output === '\n')
	t.false(child.connected)
})
```
