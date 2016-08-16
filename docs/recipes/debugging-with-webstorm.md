# Debugging AVA tests with WebStorm

Starting with version 2016.2, [WebStorm](https://www.jetbrains.com/webstorm/) and other JetBrains IDEs (IntelliJ IDEA Ultimate, PhpStorm, PyCharm Professional, and RubyMine with installed Node.js plugin) allow you to debug AVA tests. 

## Setup

Set breakpoints in the tests you would like to debug.

Add a new *Node.js Run/Debug configuration*: select `Edit Configurations...` from the drop-down list on the top right, then click `+` and select *Node.js*.

In the `JavaScript file` field specify the path to AVA in the project' `node_modules` folder: `node_modules/.bin/ava` on OS X and Linux or `node_modules/.bin/ava.cmd` on Windows.

In the `Application parameters` pass the CLI flags you're using and the test files, e.g. `--verbose test.js`.

Save the configuration.

## Debug

Hit the green `Debug` button next to the list of configurations on the top right of the IDE. The *Debug tool window* will appear. Once the breakpoint is hit, you can evaluate variables and step through the code. When debugging multiple test files, you can switch between the processes using the drop-down in the Frames pane.
