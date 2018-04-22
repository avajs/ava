import test from '../../../..';

test('passes', t => {
	Promise.reject(new Error('Can\'t catch me'));
	t.pass();
});

test('unhandled non-error rejection', t => {
	const err = null;
	Promise.reject(err);
	t.pass();
});
