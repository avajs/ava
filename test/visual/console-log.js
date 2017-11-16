import delay from 'delay';
import test from '../..';

test('testName1', async t => {
	console.log('foo');
	await delay(2000);
	console.log('baz');
	t.pass();
});

test('testName2', async t => {
	await delay(1000);
	console.log('bar');
	await delay(2000);
	console.log('quz');
	t.pass();
});
