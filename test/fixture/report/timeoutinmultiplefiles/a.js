const test = require('../../../..');

test('a passes', t => t.pass());

test.cb('a slow', t => {
	setTimeout(t.end, 15000);
});
test.cb('a slow two', t => {
	setTimeout(t.end, 15000);
});

test('a passes two', t => t.pass());
