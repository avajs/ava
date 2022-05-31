# Debugging tests with WebStorm

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/debugging-with-webstorm.md)

**This recipe is outdated.**

---

Starting with version 2016.2, [WebStorm](https://www.jetbrains.com/webstorm/) and other JetBrains IDEs (IntelliJ IDEA Ultimate, PHPStorm, PyCharm Professional, and RubyMine with installed Node.js plugin) allow you to debug AVA tests.


## Setup using Node.js

Add a new *Node.js Run/Debug configuration*: select `Edit Configurations...` from the dropdown list on the top right, then click `+` and select *Node.js*.

In the `JavaScript file` field specify the path to AVA in the project's `node_modules` folder: `node_modules/.bin/ava` on macOS and Linux or `node_modules/.bin/ava.cmd` on Windows.

In the `Application parameters` pass the CLI flags you're using and the test files you would like to debug, for example `--verbose test.js`.

In the `Node parameters`, pass the `--inspect-brk` flag to enable the Node inspector.

Save the configuration.

## Setup using npm

Execute `npx @ava/init` in your project directory to add AVA to your `package.json`.

Your `package.json` will look something like this:

```json
{
	"name": "awesome-package",
	"scripts": {
		"test": "ava"
	},
	"devDependencies": {
		"ava": "^1.0.0"
	}
}
```

Add a new *npm Run/Debug configuration*: select `Edit Configurations...` from the dropdown list on the top right, then click `+` and select *npm*.

Use the following configuration parameters:

- `package.json`: Path to your project's `package.json` file
- `Command`: `test`

Your IDE will then execute `npm run test` and thus call `node_modules/.bin/ava` and the AVA-configuration you have specified in your package.json.

In the `Node parameters`, pass `--inspect-brk`.

Don't forget to select a Node.js interpreter.

Save the configuration.

## Debug

Set breakpoints in the code.

Hit the green `Debug` button next to the list of configurations on the top right. The *Debug tool window* will appear. Once the breakpoint is hit, you can evaluate variables and step through the code. When debugging multiple test files, you can switch between the processes using the dropdown in the Frames pane.
