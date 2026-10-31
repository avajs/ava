# Rebuilding reporter log files

`*.log` files contain reporter output. There are separate files for every supported Node.js version.

To update a specific set of files you can run:

```console
NODE_NO_WARNINGS=1 UPDATE_REPORTER_LOG=1 pnpm exec tap -j2 test-tap/reporters/{default,tap}.js
```

This uses the Node.js version pnpm has installed for the project (see `devEngines` in `package.json`), not the one on your `PATH`.

You'll need to run this for each supported (major) Node.js version. For example, [with mise](https://mise.jdx.dev/getting-started.html#mise-exec-run), run tap's entry point with the desired Node.js version directly. The `tap` executable in `node_modules/.bin` would otherwise use pnpm's Node.js version:

```console
NODE_NO_WARNINGS=1 UPDATE_REPORTER_LOG=1 mise exec node@26 -- node node_modules/tap/dist/esm/run.mjs -j2 test-tap/reporters/{default,tap}.js
NODE_NO_WARNINGS=1 UPDATE_REPORTER_LOG=1 mise exec node@24 -- node node_modules/tap/dist/esm/run.mjs -j2 test-tap/reporters/{default,tap}.js
NODE_NO_WARNINGS=1 UPDATE_REPORTER_LOG=1 mise exec node@22 -- node node_modules/tap/dist/esm/run.mjs -j2 test-tap/reporters/{default,tap}.js
```
