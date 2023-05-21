export default {
	require: [
		['./required.mjs', 'hello', 'world'],
		['./required.cjs', 'goodbye'],
		'./side-effect.js',
	],
};
