import test from '@ava/test';
import trimOffNewlines from '../../lib/trim-off-newlines.js';

test('newlines are trimmed on Windows', t => {
	const text = '\r\nWindows formatted newlines\r\n\r\n';
	const desiredText = 'Windows formatted newlines';
	t.is(trimOffNewlines(text), desiredText);
});

test('newlines are trimmed on Linux', t => {
	const text = '\nLinux formatted newlines\n\n';
	const desiredText = 'Linux formatted newlines';
	t.is(trimOffNewlines(text), desiredText);
});

test('newlines are trimmed on macOS', t => {
	const text = '\rMac formatted newlines\r\r';
	const desiredText = 'Mac formatted newlines';
	t.is(trimOffNewlines(text), desiredText);
});

test('inner newlines are not trimmed on Windows', t => {
	const text = '\r\nWindows formatted newlines\r\n with an inner newline\r\n'
	const desiredText = 'Windows formatted newlines\r\n with an inner newline'
	t.is(trimOffNewlines(text), desiredText);
})

test('inner newlines are not trimmed on Linux', t => {
	const text = '\nLinux formatted newlines\n with an inner newline\n'
	const desiredText = 'Linux formatted newlines\n with an inner newline'
	t.is(trimOffNewlines(text), desiredText);
})

test('inner newlines are not trimmed on Mac', t => {
	const text = '\rMac formatted newlines\r with an inner newline\r'
	const desiredText = 'Mac formatted newlines\r with an inner newline'
	t.is(trimOffNewlines(text), desiredText);
})
