# Debugging tests with Visual Studio Code

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/debugging-with-vscode.md)

## Setup

In the sidebar click the `Debug` handle.

Add a new configuration in the dropdown menu next to the green `Debug` button: `Add configuration`. This will open `launch.json` with all debug configurations.

Add following to the `configurations` object:

```json
{
	"type": "node",
	"request": "launch",
	"name": "Run AVA test",
	"program": "${workspaceRoot}/node_modules/ava/profile.js",
	"args": [
	  "${file}"
	],
	"skipFiles": [
		"<node_internals>/**/*.js"
	]
}
```

Save this configuration after you added it.

## Debug

> **Note:** The file you want to debug, must be open and active

> **Note:** The breakpoints in VSCode are a bit buggy sometimes (especially with async code). `debugger;` always works fine.

Set breakpoints in the code **or** write `debugger;` at the point where it should stop.

Hit the green `Debug` button next to the list of configurations on the top left in the `Debug` view. Once the breakpoint is hit, you can evaluate variables and step through the code.

## Serial debugging

By default AVA runs tests concurrently. This may complicate debugging. Add a configuration with the `--serial` argument so AVA runs only one test at a time:

```json
{
	"type": "node",
	"request": "launch",
	"name": "Run AVA test serially",
	"program": "${workspaceRoot}/node_modules/ava/profile.js",
	"args": [
	  "--serial",
	  "${file}"
	],
	"skipFiles": [
		"<node_internals>/**/*.js"
	]
}
```

*Note that, if your tests aren't properly isolated, certain test failures may not appear when running the tests serially.*
