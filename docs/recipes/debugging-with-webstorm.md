# Debugging tests with WebStorm

**Not yet. Requires the unreleased AVA 0.17.0**

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/debugging-with-webstorm.md)

Starting with version 2016.2, [WebStorm](https://www.jetbrains.com/webstorm/) and other JetBrains IDEs (IntelliJ IDEA Ultimate, PHPStorm, PyCharm Professional, and RubyMine with installed Node.js plugin) allow you to debug AVA tests.


## Setup

Add a new *Node.js Run/Debug configuration*: select `Edit Configurations...` from the dropdown list on the top right, then click `+` and select *Node.js*.

In the `JavaScript file` field specify the path to AVA in the project's `node_modules` folder: `node_modules/.bin/ava` on macOS and Linux or `node_modules/.bin/ava.cmd` on Windows.

In the `Application parameters` pass the CLI flags you're using and the test files you would like to debug, for example `--verbose test.js`.

Save the configuration.


## Debug

Set breakpoints in the code.

Hit the green `Debug` button next to the list of configurations on the top right. The *Debug tool window* will appear. Once the breakpoint is hit, you can evaluate variables and step through the code. When debugging multiple test files, you can switch between the processes using the dropdown in the Frames pane.
