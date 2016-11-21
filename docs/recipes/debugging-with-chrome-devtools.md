# Debugging tests with Chrome DevTools

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/debugging-with-chrome-devtools.md)

Use [inspect-process](https://github.com/jaridmargolin/inspect-process) to easily launch a debugging session with Chrome DevTools.

```console
$ npm install --global inspect-process
```

```console
$ inspect node_modules/ava/profile.js some/test/file.js
```
