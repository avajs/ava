import test from '../../';
import sinon from 'sinon';

test(t => {
	sinon.useFakeTimers(Date.now() + 10000);
	t.pass();
	t.end();
});
