export default function formatSerializedError(error) {
	const printMessage = error.values.length === 0
		? Boolean(error.message)
		: !error.values[0].label.startsWith(error.message);

	if (error.values.length === 0) {
		return {formatted: null, printMessage};
	}

	let formatted = '';
	for (const value of error.values) {
		formatted += `${value.label}\n\n${value.formatted}\n\n`;
	}

	return {formatted: formatted.trim(), printMessage};
}
