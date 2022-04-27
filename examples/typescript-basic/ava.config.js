module.exports = { // eslint-disable-line import/no-anonymous-default-export
	files: ['**/test.*'],
	typescript: {
		compile: "tsc",
		rewritePaths: {
			"source/": "build/"
		}
	}
};
