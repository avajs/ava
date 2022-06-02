const path = require('node:path');

const {default: tsd} = require('tsd');
const {default: formatter} = require('tsd/dist/lib/formatter.js');

(async () => {
	const diagnostics = await tsd({
		cwd: path.join(__dirname, '..'),
		typingsFile: 'dist/main.d.mts',
		testFiles: ['test-d/*.ts'],
	});

	if (diagnostics.length > 0) {
		throw new Error(formatter(diagnostics));
	}
})();
