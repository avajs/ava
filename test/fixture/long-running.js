import test from '../..';

test.cb('slow', t => {
	setTimeout(t.end, 5000);
});
test.cb('slow two ', t => {
	setTimeout(t.end, 5000);
});
test.cb('slow three ', t => {
	setTimeout(t.end, 5000);
});

test('fast', t => t.pass());
