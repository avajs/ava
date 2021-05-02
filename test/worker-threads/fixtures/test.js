import {isMainThread} from 'worker_threads';

import test from 'ava';

test('in worker thread', t => {
	t.false(isMainThread);
});
