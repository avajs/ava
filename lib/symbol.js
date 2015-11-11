function polyfillSymbol(key) {
	if (typeof Symbol === 'function' && !Symbol[key]) {
		Object.defineProperty(Symbol, key, {
			value: Symbol(key)
		});
	}
}

polyfillSymbol('observable');

module.exports = function (key) {
	if (typeof Symbol !== 'undefined' && Symbol[key]) {
		return Symbol[key];
	} else if (typeof Symbol !== 'undefined' && typeof Symbol.for === 'function') {
		return Symbol.for(key);
	}
	return '@@' + key;
};
