# Passing arguments to your test files

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/passing-arguments-to-your-test-files.md)

You can pass command line arguments to your test files. Use the `--` argument terminator to separate AVA's arguments from your own:

```js
// test.js
import test from 'ava';

test('argv', t => {
	t.deepEqual(process.argv.slice(2), ['--hello', 'world']);
});
```

```console
$ npx ava -- --hello world
```

You need two `--` argument terminators if you're invoking AVA through an `npm test` script:

```json
{
	"scripts": {
		"test": "ava"
	}
}
```

```console
$ npm test -- -- --hello world
```
