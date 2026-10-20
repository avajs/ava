const config = {
	require: [
		['./required-esm.js', 'hello', 'world'],
		['./required.js', 'goodbye'],
		'./side-effect.js',
	],
};

export default config;
