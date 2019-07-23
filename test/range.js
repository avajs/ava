'use strict';
require('../lib/chalk').set();

const {test} = require('tap');
const rangeParser = require('../lib/range');

test('range parse', t => {
	t.strictDeepEqual(rangeParser.parseFileSelection('a.js:3'), ['a.js', [3]]);
	t.strictDeepEqual(rangeParser.parseFileSelection('a.js:3-5'), ['a.js', [3, 4, 5]]);
	t.strictDeepEqual(rangeParser.parseFileSelection('a.js:3-5,8'), ['a.js', [3, 4, 5, 8]]);
	t.strictDeepEqual(rangeParser.parseFileSelection('a.js:3-5,8-9'), ['a.js', [3, 4, 5, 8, 9]]);
	t.strictDeepEqual(rangeParser.parseFileSelection('a.js:3-5x'), ['a.js:3-5x', []]);
	t.strictDeepEqual(rangeParser.parseFileSelection('c:\\path\\file.js'), ['c:\\path\\file.js', []]);
	t.strictDeepEqual(rangeParser.parseFileSelection('c:\\path\\file.js:27'), ['c:\\path\\file.js', [27]]);
	t.end();
});

test('range basic functionality', t => {
	const case1 = rangeParser.parseFileSelections(['a.js:5', 'a.js:6-8']);
	t.strictDeepEqual(case1, {
		filenames: ['a.js'],
		ignored: [],
		ranges: new Map([['a.js', [5, 6, 7, 8]]])
	});
	t.end();
});

test('range ignore file when there is selection', t => {
	const case1 = rangeParser.parseFileSelections(['a.js:5', 'a.js:6-8', 'a.js', 'b.js']);
	t.strictDeepEqual(case1, {
		filenames: ['a.js', 'b.js'],
		ignored: ['a.js'],
		ranges: new Map([['a.js', [5, 6, 7, 8]], ['b.js', []]])
	});
	t.end();
});
