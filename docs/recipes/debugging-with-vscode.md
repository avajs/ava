# Debugging tests with Visual Studio Code

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/debugging-with-vscode.md)

**This recipe describes the new `inspect` command in the upcoming AVA 3 release. See the [AVA 2](https://github.com/avajs/ava/blob/v2.4.0/docs/recipes/debugging-with-vscode.md) documentation instead.**

You can debug your tests using [Visual Studio Code](https://code.visualstudio.com/).

## Creating a launch configuration

1. Open a workspace for your project.
1. In the sidebar click the *Debug* handle.
1. Create a `launch.json` file.
1. Select the Node.js environment.
1. Add following to the `configurations` object:

  ```json
  {
    "type": "node",
    "request": "launch",
    "name": "Debug AVA test file",
    "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/ava",
    "runtimeArgs": [
      "debug",
      "--break",
      "${file}"
    ],
    "port": 9229,
    "outputCapture": "std",
    "skipFiles": [
      "<node_internals>/**/*.js"
    ]
  }
  ```
1. Save your changes to the `launch.json` file.

## Using the debugger

Open the file(s) you want to debug. You can set breakpoints or use the `debugger` keyword.

Now, *with a test file open*, from the *Debug* menu run the *Debug AVA test file* configuration.

## Serial debugging

By default AVA runs tests concurrently. This may complicate debugging. Add a configuration with the `--serial` argument so AVA runs only one test at a time:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug AVA test file",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/ava",
  "runtimeArgs": [
    "debug",
    "--break",
    "--serial",
    "${file}"
  ],
  "port": 9229,
  "outputCapture": "std",
  "skipFiles": [
    "<node_internals>/**/*.js"
  ]
}
```

*Note that, if your tests aren't properly isolated, certain test failures may not appear when running the tests serially.*
