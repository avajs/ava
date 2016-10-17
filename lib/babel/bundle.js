'use strict';

var fs = require('fs');
var path = require('path');

var Promise = require('bluebird');
var cml = require('cached-module-loader');
var findCacheDir = require('find-cache-dir');

var WORKER = require.resolve('./worker');

function create(babelConfig) {
	var cacheDir = findCacheDir({name: 'ava', create: true});
	var cachedDataFile = path.join(cacheDir, 'bundled-cachedData.js');
	var codeFile = path.join(cacheDir, 'bundled-code.js');

	if (fs.existsSync(cachedDataFile) && fs.existsSync(codeFile)) {
		return Promise.resolve({cachedDataFile: cachedDataFile, codeFile: codeFile});
	}

	var start = Date.now();
	var srcFile = path.join(cacheDir, 'faux-src.js');
	var testFile = path.join(cacheDir, 'faux-test.js');
	var stubFile = path.join(cacheDir, 'bundle-stub.js');

	fs.writeFileSync(srcFile, '');
	fs.writeFileSync(testFile, 'require("./faux-src")');
	fs.writeFileSync(stubFile, [
		'var babelWorker = require(' + JSON.stringify(WORKER) + ')',
		'babelWorker.runTest(' + JSON.stringify(testFile) + ', ' + JSON.stringify(babelConfig) + ')'
	].join('\n'));

	return cml.bundleDependencies(stubFile).then(function (bundle) {
		fs.writeFileSync(cachedDataFile, bundle.cachedData);
		fs.writeFileSync(codeFile, bundle.code);
		console.error('bundling took', Date.now() - start);
		return {cachedDataFile: cachedDataFile, codeFile: codeFile};
	});
}
exports.create = create;

function loadWorker(bundle) {
	var start = Date.now();
	var worker = cml.loadInThisContext(WORKER, module, {
		cachedData: new Buffer(bundle.cachedData, 'base64'),
		code: new Buffer(bundle.code, 'base64')
	});
	console.error('loading took', Date.now() - start);
	return worker;
}
exports.loadWorker = loadWorker;
