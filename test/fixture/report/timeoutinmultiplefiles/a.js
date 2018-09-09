import test from '../../../..';

test('a passes', t => t.pass());

test.cb('a slow', t => {
	setTimeout(t.end, 5000);
});
test.cb('a slow two ', t => {
	setTimeout(t.end, 5000);
});

test('a passes two', t => t.pass());

