import test from '../..';

test('test', t => {
	t.is(process.cwd(), __dirname);
});
