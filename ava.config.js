export default { // eslint-disable-line import/no-anonymous-default-export
	files: ['test/**', '!test/**/{fixtures,helpers}/**'],
	ignoredByWatcher: ['{coverage,docs,media,test-d,test-tap}/**'],
	environmentVariables: {
		AVA_FAKE_SCM_ROOT: '.fake-root', // This is an internal test flag.
	},
};
