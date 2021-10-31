// 👉 Due to the package exports, XO's use of our ESLint plugin loads this
// file using the AVA code in the repository, but our self-hosted tests use the
// installed "test-ava" version.
module.exports = {
	files: ['test/**', '!test/**/{fixtures,helpers}/**'],
	ignoredByWatcher: ['{coverage,docs,media,test-d,test-tap}/**'],
	environmentVariables: {
		AVA_FAKE_SCM_ROOT: '.fake-root', // This is an internal test flag.
	},
};
