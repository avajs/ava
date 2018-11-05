import test from '../../../..';

test('b passes', t => t.pass());

test.cb('b slow', t => {
	setTimeout(t.end, 15000);
});
test.cb('b slow two', t => {
	setTimeout(t.end, 15000);
});
test.cb('b slow three', t => {
	setTimeout(t.end, 15000);
});

test('b passes two', t => t.pass());
