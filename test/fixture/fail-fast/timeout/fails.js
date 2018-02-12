import test from '../../../../';

test.cb('slow pass', t => {
	setTimeout(t.end, 1000);
});
