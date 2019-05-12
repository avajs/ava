'use strict';

const fs = require('fs');

// eslint-disable-next-line node/no-deprecated-api
require.extensions['.custom-ext'] = function (module, filename) {
	const content = fs.readFileSync(filename, 'utf8');
	module._compile(content, filename);
};
