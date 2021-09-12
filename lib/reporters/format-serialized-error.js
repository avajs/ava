import {chalk} from '../chalk.js';

export default function formatSerializedError(error) {
	const printMessage = error.values.length === 0
		? Boolean(error.message)
		: !error.values[0].label.startsWith(error.message);

	if (error.statements.length === 0 && error.values.length === 0) {
		return {formatted: null, printMessage};
	}

	let formatted = '';
	for (const value of error.values) {
		formatted += `${value.label}\n\n${value.formatted}\n\n`;
	}

	for (const statement of error.statements) {
		formatted += `${statement[0]}\n${chalk.grey('=>')} ${statement[1]}\n\n`;
	}

	return {formatted: formatted.trim(), printMessage};
}
