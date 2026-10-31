const config = {
	extensions: [],
	files: ['tests/**/*'],
	typescript: {
		compile: false,
		rewritePaths: {
			'src/': 'build/',
		},
		extensions: ['foo'],
	},
};

export default config;
