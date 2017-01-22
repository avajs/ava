import sinon from 'sinon';
import test from '../../';

test(t => {
	sinon.useFakeTimers(Date.now() + 10000);
	t.pass();
});
