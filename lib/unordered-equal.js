export const checkValueForUnorderedEqual = value => {
	let type = 'invalid';

	if (value instanceof Map) {
		type = 'map';
	} else if (value instanceof Set) {
		type = 'set';
	} else if (Array.isArray(value)) {
		type = 'array';
	}

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
