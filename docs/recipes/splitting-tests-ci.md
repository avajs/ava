# Splitting tests in CI

AVA automatically detects whether your CI environment supports parallel builds using [ci-parallel-vars](https://www.npmjs.com/package/ci-parallel-vars).
When parallel builds support is detected, AVA sorts the all detected tests files, and splits them into chunks.
Each CI machine is assigned a chunk of the tests, and then each chunk is run in parallel.

To better distribute the tests across the machines, you can configure a custom comparator function.
For example:

**`ava.config.js`:**

```js
import fs from 'node:fs';

// Assuming 'test-data.json' structure is:
// {
//    'tests/test1.js': { order: 1 },
//    'tests/test2.js': { order: 0 }
// }
const testData = JSON.parse(fs.readFileSync('test-data.json', 'utf8'));

export default {
    ciParallelRunsComparator: (file1, file2) => testData[file1].order - testData[file2].order,
};
```
