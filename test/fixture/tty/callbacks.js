const test = require('../../..');

const takesCallbackAndReturnWriteResult = require('tty').WriteStream.prototype.clearLine.length === 1; // eslint-disable-line import/order

const assert = takesCallbackAndReturnWriteResult ?
	async (t, stream) => {
		t.is(stream.clearLine.length, 2, 'clearLine');
		await new Promise(resolve => stream.clearLine(0, resolve));
		t.is(stream.clearScreenDown.length, 1, 'clearScreenDown');
		await new Promise(resolve => stream.clearScreenDown(resolve));
		t.is(stream.cursorTo.length, 3, 'cursorTo');
		await new Promise(resolve => stream.cursorTo(0, 0, resolve));
		t.is(stream.moveCursor.length, 3, 'moveCursor');
		await new Promise(resolve => stream.moveCursor(0, 0, resolve));
	} :
	(t, stream) => {
		t.is(stream.clearLine.length, 1, 'clearLine');
		t.is(stream.clearScreenDown.length, 0, 'clearScreenDown');
		t.is(stream.cursorTo.length, 2, 'cursorTo');
		t.is(stream.moveCursor.length, 2, 'cursorTo');
	};

test('stderr tty write methods take / do not take a callback', assert, process.stderr);
test('stdout tty write methods take / do not take a callback', assert, process.stdout);
