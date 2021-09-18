export default {
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
