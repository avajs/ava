'use strict';
function whileCorked(stream, fn) {
	return function () {
		stream.cork();
		try {
			fn.apply(this, arguments);
		} finally {
			stream.uncork();
		}
	};
}
module.exports = whileCorked;
