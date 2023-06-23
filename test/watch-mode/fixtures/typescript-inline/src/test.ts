import process from 'node:process';

// This fixture is copied to a temporary directory, so manually type the test
// function and import AVA through its configured path.
type Test = (title: string, implementation: (t: {pass(): void}) => void) => void;
const {default: test} = await import(process.env['TEST_AVA_IMPORT_FROM'] ?? '') as {default: Test};

test('pass', t => {
	t.pass();
});
