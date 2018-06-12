"use strict";

var _sourceMapFixtures = require("source-map-fixtures");

var _ = _interopRequireDefault(require("../../"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const fixture = (0, _sourceMapFixtures.mapFile)('throws').require(); // The uncaught exception is passed to the corresponding cli test. The line
// numbers from the 'throws' fixture (which uses a map file), as well as the
// line of the fixture.run() call, should match the source lines from this
// string.


(0, _.default)('throw an uncaught exception', t => {
  setImmediate(run);
  t.pass();
});

const run = () => fixture.run();
//# sourceMappingURL=./source-map-initial.js.map
// Generated using node test/fixtures/_generate-source-map-initial.js
