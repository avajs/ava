'use strict';
const fs = require('fs');
const path = require('path');
const babel = require('babel-core');

const transformed = babel.transform(`
import {mapFile} from 'source-map-fixtures';
import test from '../../';

const fixture = mapFile('throws').require();

// The uncaught exception is passed to the corresponding cli test. The line
// numbers from the 'throws' fixture (which uses a map file), as well as the
// line of the fixture.run() call, should match the source lines from this
// string.
test('throw an uncaught exception', t => {
	setImmediate(run);
	t.pass();
})
const run = () => fixture.run();
`.trim(), {
	filename: 'source-map-initial-input.js',
	sourceMaps: true,
	presets: ['@ava/stage-4']
});

fs.writeFileSync(
	path.join(__dirname, 'source-map-initial.js'),
	transformed.code + '\n//# sourceMappingURL=./source-map-initial.js.map\n// Generated using node test/fixtures/_generate-source-map-initial.js\n');
fs.writeFileSync(
	path.join(__dirname, 'source-map-initial.js.map'),
	JSON.stringify(transformed.map));

console.log('Generated source-map-initial.js');
