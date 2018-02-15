import test from '../../../..';

test('passes', t => {
	setTimeout(() => {
		throw new Error('Can\'t catch me');
	});
	t.pass();
});
