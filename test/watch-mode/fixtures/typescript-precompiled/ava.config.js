import process from 'node:process';

const config = {
	typescript: {
		extensions: process.env.JUST_TS_EXTENSION ? ['ts'] : ['ts', 'js'],
		rewritePaths: {
			'src/': 'build/',
		},
		compile: false,
	},
};

export default config;
