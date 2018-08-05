'use strict';
// The execCli helper spawns tests in a child process. This means that stdout is
// a pipe and not a TTY device. Setting isTTY to true more accurately reflects
// typical testing conditions and tricks AVA into using its fake TTY logic.
if (process.env.AVA_SIMULATE_TTY) {
	process.stdout.isTTY = true;
	process.stdout.columns = 80;
	process.stdout.rows = 24;

	const colorDepth = process.env.AVA_TTY_COLOR_DEPTH ?
		parseInt(process.env.AVA_TTY_COLOR_DEPTH, 10) :
		undefined;

	if (colorDepth) {
		process.stdout.getColorDepth = () => colorDepth;
	}
}
