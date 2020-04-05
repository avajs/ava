const tty = require('tty');

// Call original method to ensure the correct errors are thrown.
const assertHasColorsArguments = count => {
	tty.WriteStream.prototype.hasColors(count);
};

const makeHasColors = colorDepth => (count = 16, env = undefined) => {
	// `count` is optional too, so make sure it's not an env object.
	if (env === undefined && typeof count === 'object' && count !== null) {
		count = 16;
	}

	assertHasColorsArguments(count);
	return count <= 2 ** colorDepth;
};

const simulateTTY = (stream, colorDepth, hasColors) => {
	stream.isTTY = true;
	stream.columns = 80;
	stream.rows = 24;

	if (colorDepth) {
		stream.getColorDepth = () => colorDepth;
	}

	if (hasColors) {
		stream.hasColors = makeHasColors(colorDepth);
	}
};

// The execCli helper spawns tests in a child process. This means that stdout is
// a pipe and not a TTY device. Setting isTTY to true more accurately reflects
// typical testing conditions and tricks AVA into using its fake TTY logic.
if (process.env.AVA_SIMULATE_TTY) {
	const colorDepth = process.env.AVA_TTY_COLOR_DEPTH ?
		parseInt(process.env.AVA_TTY_COLOR_DEPTH, 10) :
		undefined;
	const hasColors = process.env.AVA_TTY_HAS_COLORS !== undefined;

	simulateTTY(process.stderr, colorDepth, hasColors);
	simulateTTY(process.stdout, colorDepth, hasColors);
}
