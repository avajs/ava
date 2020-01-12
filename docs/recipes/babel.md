# Configuring Babel

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/babel.md)

**The upcoming AVA 3 release removes built-in Babel support. See the [AVA 2](https://github.com/avajs/ava/blob/v2.4.0/docs/recipes/babel.md) documentation instead.**

You can enable Babel support by installing `@ava/babel`, and then in AVA's configuration setting `babel` to `true`:

**`package.json`:**

```json
{
	"ava": {
		"babel": true
	}
}
```

Find out more in [`@ava/babel`](https://github.com/avajs/babel).
