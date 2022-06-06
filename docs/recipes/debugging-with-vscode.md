# Debugging tests with Visual Studio Code

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/debugging-with-vscode.md)

You can debug your tests using [Visual Studio Code](https://code.visualstudio.com/).

## Debugging with the debug terminal

You can use VS Code's “JavaScript Debug Terminal” to automatically debug AVA run on the command-line.

1. From the Command Palette (<kbd>F1</kbd> or <kbd>command + shift + p</kbd> / <kbd>control + shift + p</kbd>), run `Debug: JavaScript Debug Terminal`
2. Run `npx ava` in the terminal

## Creating a launch configuration

Alternatively you can create a launch configuration, which makes it easier to debug individual test files.

1. Open a workspace for your project.
1. In the sidebar click the *Debug* handle.
1. Create a `launch.json` file.
1. Select the Node.js environment.
1. Add following to the `configurations` array and save changes:

  ```json
  {
    "type": "node",
    "request": "launch",
    "name": "Debug AVA test file",
    "program": "${workspaceFolder}/node_modules/ava/entrypoints/cli.mjs",
    "args": [
      "${file}"
    ],
    "outputCapture": "std",
    "console": "integratedTerminal", // optional
    "skipFiles": [
      "<node_internals>/**/*.js"
    ]
  }
  ```

### Using the debugger

Open the file(s) you want to debug. You can set breakpoints or use the `debugger` keyword.

Now, *with a test file open*, from the *Debug* menu run the *Debug AVA test file* configuration.

### Debugging precompiled tests

If you compile your test files into a different directory, and run the tests *from* that directory, the above configuration won't work.

Assuming the names of your test files are unique you could try the following configuration instead. This assumes the compile output is written to the `build` directory. Adjust as appropriate:


```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug AVA test file",
  "program": "${workspaceFolder}/node_modules/ava/entrypoints/cli.mjs",
  "args": [
    "build/**/${fileBasenameNoExtension}.*"
  ],
  "outputCapture": "std",
  "console": "integratedTerminal", // optional
  "skipFiles": [
    "<node_internals>/**/*.js"
  ]
}
```

## Serial debugging

By default AVA runs tests concurrently. This may complicate debugging. Instead make sure AVA runs only one test at a time.

*Note that, if your tests aren't properly isolated, certain test failures may not appear when running the tests serially.*

If you use the debug terminal make sure to invoke AVA with `npx ava --serial`.

Or, if you're using a launch configuration, add the `--serial` argument:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug AVA test file",
  "program": "${workspaceFolder}/node_modules/ava/entrypoints/cli.mjs",
  "args": [
    "--serial",
    "${file}"
  ],
  "outputCapture": "std",
  "console": "integratedTerminal", // optional
  "skipFiles": [
    "<node_internals>/**/*.js"
  ]
}
```
