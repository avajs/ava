import Observable from 'zen-observable';
import test from '../../..';

test('test', t => {
	return new Observable(() => {
		t.pass();
	});
});
