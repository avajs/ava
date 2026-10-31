export default function formatSerializedError(formattedDetails, message) {
	const shouldPrintMessage = formattedDetails.length === 0
		? Boolean(message)
		: !formattedDetails[0].label.startsWith(message);

	if (formattedDetails.length === 0) {
		return {formatted: null, printMessage: shouldPrintMessage};
	}

	let formatted = '';
	for (const value of formattedDetails) {
		formatted += `${value.label}\n\n${value.formatted}\n\n`;
	}

	return {formatted: formatted.trim(), printMessage: shouldPrintMessage};
}
