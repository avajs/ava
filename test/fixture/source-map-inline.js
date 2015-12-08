const fixture = require('source-map-fixtures').inline('throws').require();
const test = require('../../');

// The uncaught exception is passed to the corresponding cli test. The line
// numbers from the 'throws' fixture (using an inline source map), as well as
// the line of the fixture.run() call, should match the source lines.
test('throw an uncaught exception', t => {
	setImmediate(run);
});

const run = () => fixture.run();
