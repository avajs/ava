# Common Pitfalls

## AVA in Docker

If you run AVA in Docker as part of your CI, you need to fix the appropriate environment variables. Specifically, adding `-e CI=true` in the `docker exec` command. See [https://github.com/avajs/ava/issues/751](#751).

AVA uses [is-ci](https://github.com/watson/is-ci) to decided if it's in a CI environment or not using [these](https://github.com/watson/is-ci/blob/master/index.js) variables.
