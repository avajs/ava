module.exports = {
	presets: ['@ava/stage-4'],
	env: {
		development: {
			plugins: ['../babel-plugin-test-capitalizer']
		},
		test: {
			plugins: ['../babel-plugin-test-doubler']
		}
	}
};
