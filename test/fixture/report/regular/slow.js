import test from '../../../..';

test.cb('slow', t => {
	setTimeout(t.end, 200);
});
