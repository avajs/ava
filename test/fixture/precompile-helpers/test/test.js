import test from '../../../../';
import a from './helpers/a';
import b from './_b';

test(async t => {
	await a();
	await b();

	t.pass();
});
