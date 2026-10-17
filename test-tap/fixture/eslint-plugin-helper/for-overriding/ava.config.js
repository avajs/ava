const config = {
	extensions: [],
	typescript: {
		rewritePaths: {
			'src/': 'build/',
		},
		compile: false,
		extensions: ['bar'],
	},
	files: ['build/tests/**/*'],
};

export default config;
