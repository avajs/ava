export const checkValueForUnorderedEqual = value => {
	/* eslint-disable indent, operator-linebreak, unicorn/no-nested-ternary */
	const type = (
		value instanceof Map ? 'map' :
		value instanceof Set ? 'set' :
		Array.isArray(value) ? 'array' :
		'invalid'
	);
	/* eslint-enable indent, operator-linebreak, unicorn/no-nested-ternary */

	if (type === 'invalid') {
		return {isValid: false};
	}

	return {
		isValid: true,
		type,
		size: type === 'array'
			? value.length
			: value.size,
	};
};
