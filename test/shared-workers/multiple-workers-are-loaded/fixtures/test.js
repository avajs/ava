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

const messageFromWorker1 = worker1.subscribe().next();
const messageFromWorker2 = worker2.subscribe().next();

test('can load multiple workers', async t => {
	const {value: {data: dataFromWorker1}} = await messageFromWorker1;
	const {value: {data: dataFromWorker2}} = await messageFromWorker2;

	t.deepEqual(dataFromWorker1, {id: '1'});
	t.deepEqual(dataFromWorker2, {id: '2'});
	t.pass();
});
