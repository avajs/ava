module.exports = api => {
	api.cache.forever();
	return {
		'plugins': ['../babel-plugin-test-doubler'],
	  'presets': ['@ava/stage-4']
	};
};
