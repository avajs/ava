const processOnly = new Set(['--allow-natives-syntax']);

export default {
	nodeArguments: [
		'--throw-deprecation',
		'--allow-natives-syntax',
	],
	threadArgumentsFilter: argument => !processOnly.has(argument),
};
