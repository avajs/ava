# Debugging tests with Visual Studio Code

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/debugging-with-vscode.md)

You can debug your tests using [Visual Studio Code](https://code.visualstudio.com/).

## Creating a launch configuration

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

## Using the debugger

Open the file(s) you want to debug. You can set breakpoints or use the `debugger` keyword.

Now, *with a test file open*, from the *Debug* menu run the *Debug AVA test file* configuration.

## Debugging precompiled tests

If you compile your test files into a different directory, and run the tests *from* that directory, the above configuration won't work.

Assuming the names of your test files are unique you could try the following configuration instead. This assumes the compile output is written to the `build` directory. Adjust as appropriate:


```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug AVA test file",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/ava",
  "runtimeArgs": [
    "debug",
    "--break",
    "build/**/${fileBasenameNoExtension}.*"
  ],
  "port": 9229,
  "outputCapture": "std",
  "skipFiles": [
    "<node_internals>/**/*.js"
  ]
}
```

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
