var path = require('path');
var resolveFrom = require('resolve-from');
var resolve = require('resolve');
var md5hex = require('md5-hex');
var detective = require('babel-plugin-detective');
var fs = require('graceful-fs');

var base = path.join(__dirname, '..', 'index.js');

var _babelCore;

function babelCore() {
	if (!_babelCore) {
		_babelCore = require('babel-core');
	}
	return _babelCore;
}

function Precompiler(cacheDir) {
	this._cacheDir = cacheDir;
	this._cache = {};
}

Precompiler.prototype.cachePath = function (filename) {
	return path.join(this._cacheDir, filename);
};

Precompiler.prototype.buildEntry = function (filename) {
	if (this._cache[filename]) {
		return;
	}

	var entry = this._cache[filename] = {};

	var result = babelCore().transformFileSync(filename, {
		plugins: [detective]
	});

	var hash = md5hex(result.code);
	fs.writeFileSync(this.cachePath(hash + '.js'), result.code);

	var metadata = detective.metadata(result);

	var dependencies = this.normalizeDependencies(filename, metadata);

	entry.hash = hash;
	entry.dependencies = dependencies;

	dependencies.forEach(this.buildEntry, this);
};

Precompiler.prototype.normalizeDependencies = function (filename, metadata) {
	if (metadata && metadata.expressions && (metadata.expressions === true || metadata.expressions.length)) {
		console.warn(filename + ' has a dynamic require - precompilation may not work');
	}

	if (!metadata || !metadata.strings || !metadata.strings.length) {
		return [];
	}

	var dir = path.dirname(filename);

	return metadata.strings
		.filter(function (dep) {
			return !resolve.isCore(dep);
		})
		.map(function (dep) {
			return resolveFrom(dir, dep);
		})
		.filter(Boolean)
		.filter(this.shouldTranspile, this);
};

Precompiler.prototype.shouldTranspile = function (filename) {
	return (
		(filename !== base) &&
		!/[\/\\]node_modules[\/\\]/.test(filename) &&
		/\.js$/.test(filename)
	);
};

Precompiler.prototype.createHash = function (filename, hash, metadata) {
	var hashMap = {};
	hashMap[filename] = hash;

	var dependencies = this.normalizeDependencies(filename, metadata);

	dependencies.forEach(this.buildEntry, this);

	dependencies.forEach(function (filename) {
		this.attach(filename, hashMap);
	}, this);

	return hashMap;
};

Precompiler.prototype.attach = function (filename, hashMap) {
	if (hashMap[filename] || !this._cache[filename]) {
		return;
	}

	var entry = this._cache[filename];

	hashMap[filename] = entry.hash;

	entry.dependencies.forEach(function (filename) {
		this.attach(filename, hashMap);
	}, this);
};

module.exports = Precompiler;
