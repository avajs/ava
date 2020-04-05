const test = require('../../../..');

test('passes', t => t.pass());

test.cb('slow', t => {
	setTimeout(t.end, 15000);
});
test.cb('slow two', t => {
	setTimeout(t.end, 15000);
});

test('passes two', t => t.pass());
