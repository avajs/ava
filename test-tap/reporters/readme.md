# Rebuilding reporter log files

`*.log` files contain reporter output. There are separate files for every supported Node.js version.

To update a specific set of files you can run:

```console
UPDATE_REPORTER_LOG=1 npx tap -j3 test-tap/reporters/{default,tap}.js
```

You'll need to run this for each supported (major) Node.js version. Use your favorite Node.js version manager, such as [nvm](https://github.com/nvm-sh/nvm/) or [nodenv](https://github.com/nodenv/nodenv).

Make sure to commit any new files, and of course changed ones.
