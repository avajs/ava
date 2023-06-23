import process from 'node:process';

export default {
	typescript: {
		extensions: process.env.JUST_TS_EXTENSION ? ['ts'] : ['ts', 'js'],
		rewritePaths: {
			'src/': 'build/',
		},
		compile: false,
	},
};
