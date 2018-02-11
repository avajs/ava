import delay from 'delay';
import test from '../..';

test('testName1', async t => {
	process.stdout.write('foo ');
	await delay(2000);
	process.stdout.write('baz ');
	t.pass();
});

test('testName2', async t => {
	await delay(1000);
	process.stdout.write('bar ');
	await delay(2000);
	process.stdout.write('quz ');
	await delay(1000);
	t.pass();
});

test('testName3', async t => {
	await delay(5000);
	t.pass();
});
