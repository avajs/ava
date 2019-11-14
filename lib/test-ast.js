'use strict';

const fs = require('fs');
const AST = require('recast');

/* Lives throughout one test run as `watch` mode is not supported */
const fileAstCache = {};

/**
 * Retrieve AST for a test starting at line number with a given title
 *  
 * @param test      Start line number and title of test function
 * @param filePath  Path to test file
 * @return AST      AST of test function
 */
module.exports = function ({startLineNumber, title} = {}, filePath) {
  if (!startLineNumber) {
    throw new TypeError('Start line number required.');
  }
  if (!title) {
    throw new TypeError('Test title required.');
  }
  if (!filePath) {
    throw new TypeError('File path required.')
  }

  const fileAst = parseSourceFile(filePath);
  const candidates = [];

  AST.visit(fileAst, {
    visitCallExpression(path) {
      const node = path.node;

      if (node.loc.start.line === startLineNumber) {
        candidates.push(node);
        return false;
      }

      this.traverse(path);
    }
  });

  if (candidates.length === 0) {
    throw new Error(`No test starting at line number ${startLineNumber} in ${filePath}.`);
  }

  const testAst = candidates.find(candidate => {
    const [firstArgument] = candidate.arguments;
    return firstArgument && firstArgument.value === title;
  });

  if (!testAst) {
    throw new Error(`No test \`${title}\` starting at line number ${startLineNumber} in ${filePath}.`);
  }

  return testAst;
};

function parseSourceFile(filePath) {
  const cachedAst = fileAstCache[filePath];
  if (cachedAst) {
    return cachedAst;
  }

  const source = tryReadFile(filePath);
  const fileAst = AST.parse(source);

  fileAstCache[filePath] = fileAst;

  return fileAst;
}

function tryReadFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      throw new TypeError(`${filePath} is not a file.`)
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File ${filePath} not found.`)
    }
    throw new Error(`Error accessing ${filePath}: ${error.message}`);
  }
}
