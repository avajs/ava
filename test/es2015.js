import test from 'tape';
import ava from '../lib/test';

test('run test', t => {
	ava('foo', a => {
		a.true(false);
		a.end();
	}).run().catch(err => {
		t.true(err);
		t.end();
	});
});
