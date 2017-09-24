import Observable from 'zen-observable';
import test from '../../..';

test(t => {
	return new Observable(() => {
		t.pass();
	});
});
