const isPrimitive = val => val === null || typeof val !== 'object';

export function isLikeSelector(selector) {
	if (isPrimitive(selector)) {
		return false;
	}

	const keyCount = Reflect.ownKeys(selector).length;
	if (Array.isArray(selector)) {
		// In addition to `length`, require at at least one element.
		return keyCount > 1;
	} else {
		// Require a plain object with at least one property.
		return Reflect.getPrototypeOf(selector) === Object.prototype && keyCount > 0;
	}
}

export const CIRCULAR_SELECTOR = new Error('Encountered a circular selector');

export function selectComparable(actual, selector, circular = new Set()) {
	if (circular.has(selector)) {
		throw CIRCULAR_SELECTOR;
	}

	circular.add(selector);

	if (isPrimitive(actual)) {
		return actual;
	}

	const comparable = Array.isArray(selector) ? [] : {};
	for (const [key, subselector] of Object.entries(selector)) {
		comparable[key] = isLikeSelector(subselector)
			? selectComparable(Reflect.get(actual, key), subselector, circular)
			: Reflect.get(actual, key);
	}

	return comparable;
}
