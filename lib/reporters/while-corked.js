'use strict';
function whileCorked(stream, fn) {
	return function (...args) {
		stream.cork();
		try {
			fn.apply(this, args);
		} finally {
			stream.uncork();
		}
	};
}

module.exports = whileCorked;
