# Maintaining

## IPC Debugging

AVA makes heavy use of forked processes and Node [IPC](https://nodejs.org/api/process.html#process_process_send_message_sendhandle_callback).
 This can create some difficulty tracking down bugs that occur in a different process from your test code.
 The script `debug.js` will launch a single test fixture without forking the process and will log the IPC messages 
 that would normally be sent parent process.

```sh
$ debug.js test/fixture/async-await.js
....
{
    "name": "test",
    "data": {
        "duration": 5,
        "title": "async function",
        "error": {},
        "type": "test"
    }
}
....
```

## Release process

- Bump dependencies.
- Ensure [Travis CI](https://travis-ci.org/sindresorhus/ava) and [AppVeyor](https://ci.appveyor.com/project/sindresorhus/ava/branch/master) are green.
- Publish a new version using [`np`](https://github.com/sindresorhus/np) with a version number according to [semver](http://semver.org).
- Write a [release note](https://github.com/sindresorhus/ava/releases/new) following the style of previous release notes.


## Pull requests

New features should come with tests and documentation.
