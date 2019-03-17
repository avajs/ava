import test from '../../../..';

test('passes needle', t => t.pass());

test.cb('slow needle', t => {
	setTimeout(t.end, 15000);
});
test.cb('slow two', t => {
	setTimeout(t.end, 15000);
});
test.cb('slow three needle', t => {
	setTimeout(t.end, 15000);
});

test('passes two', t => t.pass());
