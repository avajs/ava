const fixture = require('source-map-fixtures').mapFile('throws').require();
const test = require('../../');

const run = () => fixture.run();

// The uncaught exception is passed to the corresponding cli test. The line
// numbers from the 'throws' fixture (which uses a map file), as well as the
// line of the fixture.run() call, should match the source lines.
test('throw an uncaught exception', t => {
	setImmediate(run);
	t.pass();
});
