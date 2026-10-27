const processOnly = new Set(['--allow-natives-syntax']);

const config = {
	nodeArguments: [
		'--throw-deprecation',
		'--allow-natives-syntax',
	],
	filterNodeArgumentsForWorkerThreads: argument => !processOnly.has(argument),
};

export default config;
