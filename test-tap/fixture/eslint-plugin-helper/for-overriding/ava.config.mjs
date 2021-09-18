export default {
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
