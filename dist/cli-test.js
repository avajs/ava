var resolvedFakeName = require('path').resolve('ava/cli');
var Module = require('module');
var realResolve = Module._resolveFilename;
var resolveCwd = require('resolve-cwd');

Module._resolveFilename = function fakeResolve(request, parent) {
  if (request === 'ava/cli') {
    return resolvedFakeName;
  }
  if (request === resolvedFakeName) {
    return resolvedFakeName;
  }

  return realResolve(request, parent);
};

require.cache[resolvedFakeName] = {
  id: resolvedFakeName,
  filename: resolvedFakeName,
  loaded: true,
  exports: function () { console.log('MOCKED CLI()'); }
};

var localCLI = resolveCwd('ava/cli');

var cli = require(localCLI);
console.log(cli());
