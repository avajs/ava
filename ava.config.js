import process from 'node:process';

const skipWatchMode = process.env.TEST_AVA_SKIP_WATCH_MODE ? ['!test/watch-mode/**'] : [];

export default { // eslint-disable-line import/no-anonymous-default-export
	files: ['test/**', '!test/**/{fixtures,helpers}/**', ...skipWatchMode],
	watchMode: {
		ignoreChanges: ['{coverage,docs,media,test-types,test-tap}/**'],
	},
	environmentVariables: {
		AVA_FAKE_SCM_ROOT: '.fake-root', // This is an internal test flag.
	},
};
