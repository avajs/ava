import test from '@ava/test';

import trimOffNewlines from '../../lib/trim-off-newlines.j';

test('newlines are trimmed on Windows', t => {
	const text = '\r\nThis is an \r\nexample\r\n of a sentence\r\n with Windows \r\nformatted newlines.\r\n';
	const desiredText = 'This is an example of a sentence with Windows formatted newlines';
	t.is(trimOffNewlines(text), desiredText);
});

test('newlines are trimmed on Linux', t => {
	const text = '\nThis is an \nexample\n of a sentence\n with Linux \nformatted newlines.\n';
	const desiredText = 'This is an example of a sentence with Linux formatted newlines';
	t.is(trimOffNewlines(text), desiredText);
});

test('newlines are trimmed on macOS', t => {
	const text = '\rThis is an \rexample\r of a sentence\r with Mac \rformatted newlines.\r';
	const desiredText = 'This is an example of a sentence with Mac formatted newlines';
	t.is(trimOffNewlines(text), desiredText);
});
