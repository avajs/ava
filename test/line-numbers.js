'use strict';

const path = require('path');
const {test} = require('tap');
const {
  parseLineNumbers,
  parseLineNumbersInPath,
  hasLineNumbersSuffix,
  stripLineNumbersSuffix,
  resolveEndLineNumberForTestInFile,
  getLineNumberRangeForTestInFile,
  isTestSelectedByLineNumbers
} = require('../lib/line-numbers');

const noop = () => {};
const testFilePath = path.join(__dirname, 'fixture/line-numbers.js');
const stubCallSite = ({fileName, lineNumber}) => ({
  getFileName: () => fileName,
  getLineNumber: () => lineNumber,
  getColumnNumber: noop,
  isNative: noop
});

test('parse single number', t => {
  t.strictDeepEqual(parseLineNumbers('2'), [2]);
  t.strictDeepEqual(parseLineNumbers('10'), [10]);
  t.end();
});

test('parse multiple numbers', t => {
  t.strictDeepEqual(parseLineNumbers('2,10'), [2, 10]);
  t.end();
});

test('parse single range', t => {
  t.strictDeepEqual(parseLineNumbers('2-4'), [2, 3, 4]);
  t.end();
});

test('parse multiple ranges', t => {
  t.strictDeepEqual(parseLineNumbers('2-4,8-10'), [2, 3, 4, 8, 9, 10]);
  t.end();
});

test('parse overlapping ranges', t => {
  t.strictDeepEqual(parseLineNumbers('2-4,3-5'), [2, 3, 4, 5]);
  t.end();
});

test('parse mix of number and range', t => {
  t.strictDeepEqual(parseLineNumbers('2,8-10'), [2, 8, 9, 10]);
  t.end();
});

test('parse overlap between number and range', t => {
  t.strictDeepEqual(parseLineNumbers('3,2-4'), [2, 3, 4]);
  t.end();
});

test('parse line numbers with whitespace', t => {
  t.strictDeepEqual(parseLineNumbers(' 2 , 3 - 4 '), [2, 3, 4]);
  t.end();
});

test('parse non-positive numbers -> throws', t => {
  t.throws(() => parseLineNumbers('0'), {
    message: 'Invalid line number: `0`. Line numbers must be positive.'
  });
  t.throws(() => parseLineNumbers('-2'), {
    message: 'Invalid line number: `-2`. Line numbers must be positive.'
  });
  t.throws(() => parseLineNumbers('-2--1'), {
    message: 'Invalid line number range: `-2--1`. Line numbers must be positive.'
  });
  t.end();
});

test('parse reversely ordered range -> throws', t => {
  t.throws(() => parseLineNumbers('3-1'), {
    message: 'Invalid line number range: `3-1`. `start` must be lesser than `end`.'
  });
  t.end();
});

test('parse invalid input -> throws', t => {
  t.throws(() => parseLineNumbers(), {
    message: 'Invalid line number: `undefined`. Expected comma-separated list of `[X|Y-Z]`.'
  });
  t.throws(() => parseLineNumbers(null), {
    message: 'Invalid line number: `null`. Expected comma-separated list of `[X|Y-Z]`.'
  });
  t.throws(() => parseLineNumbers(' '), {
    message: 'Invalid line number: ` `. Expected comma-separated list of `[X|Y-Z]`.'
  });
  t.throws(() => parseLineNumbers('a'), {
    message: 'Invalid line number: `a`. Expected comma-separated list of `[X|Y-Z]`.'
  });
  t.throws(() => parseLineNumbers('a-b'), {
    message: 'Invalid line numbers: `a-b`. Expected comma-separated list of `[X|Y-Z]`.'
  });
  t.throws(() => parseLineNumbers('1..3'), {
    message: 'Invalid line numbers: `1..3`. Expected comma-separated list of `[X|Y-Z]`.'
  });
  t.throws(() => parseLineNumbers('1-2 3-4'), {
    message: 'Invalid line numbers: `1-2 3-4`. Expected comma-separated list of `[X|Y-Z]`.'
  });
  t.throws(() => parseLineNumbers('1-2:3-4'), {
    message: 'Invalid line numbers: `1-2:3-4`. Expected comma-separated list of `[X|Y-Z]`.'
  });
  t.end();
});

test('parse line numbers in path', t => {
  t.strictDeepEqual(parseLineNumbersInPath('test/foo.js:3,8-10'), [3, 8, 9, 10]);
  t.end();
});

test('valid number suffix', t => {
  t.true(hasLineNumbersSuffix('test/foo.js:3'));
  t.end();
});

test('valid range suffix', t => {
  t.true(hasLineNumbersSuffix('./test/foo.js:2-4'));
  t.end();
});

test('valid mixed suffix', t => {
  t.true(hasLineNumbersSuffix('./test/foo.js:3,2-4'));
  t.end();
});

// Let valid delimiter with invalid formats through for parser to give friendly error messages
test('file delimiter with invalid suffix', t => {
  t.true(hasLineNumbersSuffix('./test/foo.js:-4'));
  t.end();
});

test('no file delimiter', t => {
  t.false(hasLineNumbersSuffix('./test/foo.js'));
  t.end();
});

test('file delimiter without numbers in file name', t => {
  t.false(hasLineNumbersSuffix('./test/foo:bar.js'));
  t.end();
});

test('file delimiter and numbers in file name', t => {
  t.false(hasLineNumbersSuffix('./test/foo:3.js'));
  t.end();
});

test('strip line numbers suffix', t => {
  t.is(stripLineNumbersSuffix('test/foo.js:3,8-10'), 'test/foo.js');
  t.end();
});

test('ignore file delimiter in file name', t => {
  t.is(stripLineNumbersSuffix('test/foo:bar.js'), 'test/foo:bar.js');
  t.end();
});

test('resolve end line number for test', t => {
  t.strictDeepEqual(resolveEndLineNumberForTestInFile({startLineNumber: 3, title: 'unicorn'}, testFilePath), 5);
  t.strictDeepEqual(resolveEndLineNumberForTestInFile({startLineNumber: 7, title: 'rainbow'}, testFilePath), 9);
  t.end();
});

test('resolve end line number with no test starting at line number -> throws', t => {
  t.throws(() => resolveEndLineNumberForTestInFile({startLineNumber: 6, title: 'horse'}, testFilePath),
    /Failed to resolve end line number for test `horse` starting at line number 6 in .*\/fixture\/line-numbers\.js: No test .*/
  );
  t.end();
});

test('get line number range for test in file', t => {
  t.strictDeepEqual(
    getLineNumberRangeForTestInFile('unicorn', testFilePath, {
      callSites: [stubCallSite({lineNumber: 3, fileName: testFilePath})]
    }),
    {startLineNumber: 3, endLineNumber: 5}
  );
  t.strictDeepEqual(
    getLineNumberRangeForTestInFile('rainbow', testFilePath, {
      callSites: [stubCallSite({lineNumber: 7, fileName: testFilePath})]
    }),
    {startLineNumber: 7, endLineNumber: 9}
  );
  t.end();
});

test('get line number range for test in file never being called -> throws', t => {
  t.throws(() => getLineNumberRangeForTestInFile('unicorn', testFilePath),
    /Failed to resolve line number range for test in .*\/fixture\/line-numbers\.js: Test never called\./
  );
  t.end();
});

test('is test selected by line numbers, match', t => {
  t.true(isTestSelectedByLineNumbers({startLineNumber: 3, endLineNumber: 5}, [4]));
  t.end();
});

test('is test selected by line numbers, no match', t => {
  t.false(isTestSelectedByLineNumbers({startLineNumber: 7, endLineNumber: 9}, [6]));
  t.end();
});

test('is test selected by line numbers, invalid test line number range -> throws', t => {
  const selectedLineNumbers = [3];
  t.throws(() => isTestSelectedByLineNumbers({}, selectedLineNumbers),
    /Invalid test line number range undefined-undefined\: Must be integers\./
  );
  t.throws(() => isTestSelectedByLineNumbers({startLineNumber: 3}, selectedLineNumbers),
    /Invalid test line number range 3-undefined\: Must be integers\./
  );
  t.throws(() => isTestSelectedByLineNumbers({endLineNumber: 5}, selectedLineNumbers),
    /Invalid test line number range undefined-5\: Must be integers\./
  );
  t.end();
});

test('is test selected by line numbers, empty selected line numbers -> throws', t => {
  const testLineNumberRange = {startLineNumber: 3, endLineNumber: 5};
  t.throws(() => isTestSelectedByLineNumbers(testLineNumberRange),
    /Selected line numbers must be non-empty array\./
  );
  t.throws(() => isTestSelectedByLineNumbers(testLineNumberRange, 3),
    /Selected line numbers must be non-empty array\./
  );
  t.throws(() => isTestSelectedByLineNumbers(testLineNumberRange, []),
    /Selected line numbers must be non-empty array\./
  );
  t.end();
});
