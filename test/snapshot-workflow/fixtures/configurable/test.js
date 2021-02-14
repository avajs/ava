const avaTest = require(process.env.AVA_PATH); // This fixture is copied to a temporary directory, so require AVA through its configured path.
const yargs = require(process.env.YARGS_PATH); // Similarly, require yargs through a path configured by the test.
const test = configure();

// This is a configurable test fixture. Command-line arguments can modify the
// tests and assertions. Pass numbered arguments `--0`, `--1` etc to select
// tests to configure. Use nested property `--n.title` to set the test title,
// `--n.omit` to omit the test, `--n.skip` to `.skip()` the test. Use nested
// numeric arguments `--n.m` to select the `m`th snapshot assertion in the `n`th
// test for configuration. `--n.m.message` sets the assertion message.
// `--n.m.omit` omits the assertion. `--n.m.skip` skips the assertion.

test('foo', t => {
	t.snapshot({foo: 'one'});
	t.snapshot({foo: 'two'});
});

test('bar', t => {
	t.pass();
});

test('baz', t => {
	t.snapshot({baz: 'one'});
	t.snapshot({baz: 'two'});
	t.snapshot({baz: 'three'});
});

test('quux', t => {
	t.snapshot({quux: 'one'});
});

function configure() {
	const config = yargs.argv;
	let nextTestIndex = 0;

	return (givenTitle, implementation) => {
		const testConfig = config[nextTestIndex++] || {};
		const title = testConfig.title || givenTitle;
		const testOrSkip = testConfig.skip ? avaTest.skip : avaTest;

		if (!testConfig.omit) {
			testOrSkip(title, t => {
				let nextSnapshotIndex = 0;

				const snapshot = (expectation, givenMessage) => {
					const snapshotConfig = testConfig[nextSnapshotIndex++] || {};
					const message = snapshotConfig.message || givenMessage;
					const assertion = snapshotConfig.skip ? t.snapshot.skip : t.snapshot;

					if (!snapshotConfig.omit) {
						return assertion(expectation, message);
					}
				};

				return implementation({...t, snapshot});
			});
		}
	};
}
