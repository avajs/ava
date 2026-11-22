import process from 'node:process';

const config = {
	files: ['basic.js'],
	...(process.env.TAP_SETTING !== undefined && {tap: process.env.TAP_SETTING === 'true'}),
	nonSemVerExperiments: process.env.PLUGIN_TEST_NOTICES ? {observeRunsFromConfig: true} : {},
};

export default config;
