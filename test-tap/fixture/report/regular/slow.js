const test = require('../../../..');

test.cb('slow', t => {
	setTimeout(t.end, 200);
});
