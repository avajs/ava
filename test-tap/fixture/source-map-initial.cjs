'use strict';

const _sourceMapFixtures = require('source-map-fixtures');

const _ = require('../../entrypoints/main.cjs');

const _2 = _interopRequireDefault(_);

function _interopRequireDefault(object) {
	return object && object.__esModule ? object : {default: object};
}

const fixture = (0, _sourceMapFixtures.mapFile)('throws').require();

// The uncaught exception is passed to the corresponding cli test. The line
// numbers from the 'throws' fixture (which uses a map file), as well as the
// line of the fixture.run() call, should match the source lines from this
// string.
(0, _2.default)('throw an uncaught exception', t => {
	setImmediate(run);
	t.pass();
});
const run = () => fixture.run();
// # sourceMappingURL=./source-map-initial.cjs.map
// Generated using node test/fixtures/_generate-source-map-initial.cjs
