import test from '../../..'
import Observable from 'zen-observable'

test(t => {
	return new Observable(() => {
		t.pass();
	});
});
