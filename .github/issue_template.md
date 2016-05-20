<!-- CLICK "Preview" FOR INSTRUCTIONS IN A MORE READABLE FORMAT -->

## Prerequisites

- We realize there is a lot of data requested here. We ask only that you do your best to provide as much information as possible so we can better help you.
- Read the [contributing guidelines](https://github.com/sindresorhus/ava/blob/master/contributing.md).
- Support questions are better asked in one of the following locations:
  - [Our chat](https://gitter.im/sindresorhus/ava)
  - [Stack Overflow](https://stackoverflow.com/questions/tagged/ava)
- Ensure the issue isn't already reported.
- Should be reproducible with the latest AVA version.
  - (Ensure `ava --version` matches ![](https://img.shields.io/npm/v/ava.svg))

*Delete the above section and the instructions in the sections below before submitting*

## Description

If this is a feature request, explain why it should be added. Specific use cases are best.

For bug reports, please provide as much *relevant* info as possible.

### Test Source

```js
// Avoid posting hundreds of lines of source code.
// Edit to just the relevant portions.
```

### Error Message & Stack Trace

```
COPY THE ERROR MESSAGE, INCLUDING STACK TRACE HERE
```

### Config

Copy the relevant section from `package.json`:

```json
{
  "ava": {
  ...
  }
}
```

### Command Line Arguments

Copy your npm build scripts or the `ava` command used:

```
ava [OPTIONS HERE]
```

## Relevant Links

- If your project is public, link to the repo so we can investigate directly.
- **BONUS POINTS:** Create a [minimal reproduction](http://stackoverflow.com/help/mcve) and upload it to GitHub. This will get you the fastest support.

## Environment

Tell us which operating system you are using, as well as which versions of  Node.js, npm, and AVA. Run the following to get it quickly:

```
node -e "var os=require('os');console.log('Node.js ' + process.version + '\n' + os.platform() + ' ' + os.release())"
ava --version
npm --version
```
