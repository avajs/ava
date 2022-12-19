import test from 'ava';
import {registerSharedWorker} from 'ava/plugin';

const worker1 = registerSharedWorker({
	filename: new URL('worker.mjs#1', import.meta.url),
	supportedProtocols: ['ava-4'],
	initialData: {
		id: '1',
	},
});

const worker2 = registerSharedWorker({
	filename: new URL('worker.mjs#2', import.meta.url),
	supportedProtocols: ['ava-4'],
	initialData: {
		id: '2',
	},
});

test('can load multiple workers', async t => {
	const {value: {data: dataFromWorker1}} = await worker1.subscribe().next();
	const {value: {data: dataFromWorker2}} = await worker2.subscribe().next();

	t.deepEqual(dataFromWorker1, {id: '1'});
	t.deepEqual(dataFromWorker2, {id: '2'});
});
