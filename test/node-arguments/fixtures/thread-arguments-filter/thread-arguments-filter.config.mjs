const processOnly = new Set(['--allow-natives-syntax']);

export default {
	nodeArguments: [
		'--throw-deprecation',
		'--allow-natives-syntax',
	],
	filterNodeArgumentsForWorkerThreads: argument => !processOnly.has(argument),
};
