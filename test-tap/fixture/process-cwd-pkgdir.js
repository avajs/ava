import {fileURLToPath} from 'node:url';

import test from '../../entrypoints/main.js';

test('test', t => {
	t.is(process.cwd(), fileURLToPath(new URL('.', import.meta.url)));
});
