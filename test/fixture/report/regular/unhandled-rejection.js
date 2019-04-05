import test from '../../../..';

const passes = t => {
	Promise.reject(new Error('Can\'t catch me'));
	t.pass();
};

test('passes', passes);

test('unhandled non-error rejection', t => {
	const err = null;
	Promise.reject(err);
	t.pass();
});
