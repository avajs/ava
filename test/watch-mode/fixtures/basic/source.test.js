import source from './source.js';

const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so import AVA through its configured path.

test('source', t => {
	t.is(source, 'source');
});
