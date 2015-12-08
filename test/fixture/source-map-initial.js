'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _sourceMapFixtures = require('source-map-fixtures');

var _ = require('../../');

var _2 = _interopRequireDefault(_);

var fixture = (0, _sourceMapFixtures.mapFile)('throws').require();
(0, _2['default'])('throw an uncaught exception', function (t) {
  setImmediate(run);
});
var run = function run() {
  return fixture.run();
};
//# sourceMappingURL=./source-map-initial.js.map
// Generated using node test/fixtures/_generate-source-map-initial.js
