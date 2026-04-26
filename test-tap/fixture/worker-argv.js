import {fileURLToPath} from 'node:url';

import test from '../../entrypoints/main.js';

test('argv', t => {
	t.deepEqual(process.argv, [process.execPath, fileURLToPath(import.meta.resolve('../../lib/worker/base.js')), '--hello', 'world']);
});
