import other from './other.js';

const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM);

test('other', t => {
	t.is(other, 'other');
});
