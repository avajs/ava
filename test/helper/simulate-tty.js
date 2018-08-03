'use strict';

const simulateTTY = (stream, colorDepth) => {
	stream.isTTY = true;
	stream.columns = 80;
	stream.rows = 24;

	if (colorDepth) {
		stream.getColorDepth = () => colorDepth;
	}
};

// The execCli helper spawns tests in a child process. This means that stdout is
// a pipe and not a TTY device. Setting isTTY to true more accurately reflects
// typical testing conditions and tricks AVA into using its fake TTY logic.
if (process.env.AVA_SIMULATE_TTY) {
	const colorDepth = process.env.AVA_TTY_COLOR_DEPTH ?
		parseInt(process.env.AVA_TTY_COLOR_DEPTH, 10) :
		undefined;

	simulateTTY(process.stderr, colorDepth);
	simulateTTY(process.stdout, colorDepth);
}
