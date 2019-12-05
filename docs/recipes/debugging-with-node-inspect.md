# Debugging tests with node-inspect

Because ava exectes its tests in parallel over multiple worker processes, it doesn't play nice with node's inspect feature by default.

If you want to use the [node inspect CLI debugger](https://nodejs.org/api/debugger.html), you can use the `profile.js` entrypoint like this:
```
node inspect ./node_modules/ava/profile.js <file>
```
Where `<file>` is the test you want to debug. It is currently only possible to debug one testfile at a time.

If you want to use yarn or npm to start the debugger you can add the following script in your `package.json`:

```json
{
  "scripts": {
    "test:debug": "node inspect ./node_modules/ava/profile.js --"
  }
}
```

You can now debug in your console using `{npm,yarn} run test:debug test/test.js`



