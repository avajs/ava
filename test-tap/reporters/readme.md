# Rebuilding reporter log files

`*.log` files contain reporter output. There are separate files for every supported Node.js version.

To update a specific set of files you can run:

```console
NODE_NO_WARNINGS=1 UPDATE_REPORTER_LOG=1 npx tap -j2 test-tap/reporters/{default,tap}.js
```

You'll need to run this for each supported (major) Node.js version. Use your favorite Node.js version manager, such as [Volta](https://volta.sh/):

```console
NODE_NO_WARNINGS=1 UPDATE_REPORTER_LOG=1 volta run --node 22 npx tap -j2 test-tap/reporters/{default,tap}.js
NODE_NO_WARNINGS=1 UPDATE_REPORTER_LOG=1 volta run --node 20 npx tap -j2 test-tap/reporters/{default,tap}.js
NODE_NO_WARNINGS=1 UPDATE_REPORTER_LOG=1 volta run --node 18 npx tap -j2 test-tap/reporters/{default,tap}.js
```

Or, with some more shell scripting magic:

```console
jq <package.json '.engines.node|split(" || ")|.[]' -r|NODE_NO_WARNINGS=1 UPDATE_REPORTER_LOG=1 xargs -I {} volta run --node {} npx tap -j2 test-tap/reporters/{default,tap}.js
```

Make sure to commit any new files, and of course changed ones.
