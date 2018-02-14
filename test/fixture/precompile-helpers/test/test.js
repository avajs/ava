import test from '../../../..';
import a from './helpers/a';
import b from './_b';

test('test', async t => {
	await a();
	await b();

	t.pass();
});
