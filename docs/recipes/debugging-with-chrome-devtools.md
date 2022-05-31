# Debugging tests with Chrome DevTools

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/debugging-with-chrome-devtools.md)

You can debug your tests using [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools).

Open Chrome, then navigate to <chrome://inspect/>. Click the *Open dedicated DevTools for Node* link within the *Devices* section.

In the *DevTools for Node* window, navigate to *Sources* and in the left-hand column select *Filesystem*. Add your project directory to the workspace. Make sure to grant permission.

Now run a specific test file:

```console
npx ava debug test.js
```

The DevTools should connect automatically and your tests will run. Use DevTools to set breakpoints, or use the `debugger` keyword.

Run with the `--break` option to ensure the DevTools hit a breakpoint right before the test file is loaded:

```console
npx ava debug --break test.js
```

By default the inspector listens on `127.0.0.1:9229`. You can customize the host and the port:

```console
npx ava debug --host 0.0.0.0 --port 9230 test.js
```

You'll have to add a connection for this port in the *Connection* tab.
