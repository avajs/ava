'use strict';

var babel = require('babel-core');
var fs = require('fs');
var path = require('path');

var transformed = babel.transform([
	"import { mapFile } from 'source-map-fixtures'",
	"import test from '../../'",
	"const fixture = mapFile('throws').require()",
	// The uncaught exception is passed to the corresponding cli test. The line
	// numbers from the 'throws' fixture (which uses a map file), as well as the
	// line of the fixture.run() call, should match the source lines from this
	// string.
	"test('throw an uncaught exception', t => {",
	"  setImmediate(run)",
	"})",
	"const run = () => fixture.run()"
].join('\n'), {
	filename: 'source-map-initial-input.js',
	sourceMaps: true
});

fs.writeFileSync(
	path.join(__dirname, 'source-map-initial.js'),
	transformed.code + '\n//# sourceMappingURL=./source-map-initial.js.map\n// Generated using node test/fixtures/_generate-source-map-initial.js\n');
fs.writeFileSync(
	path.join(__dirname, 'source-map-initial.js.map'),
	JSON.stringify(transformed.map));
console.log('Generated source-map-initial.js');
