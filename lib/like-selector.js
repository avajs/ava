const isPrimitive = value => value === null || typeof value !== 'object';

export function isLikeSelector(selector) {
	// Require selector to be an array or plain object.
	if (
		isPrimitive(selector)
		|| (!Array.isArray(selector) && Reflect.getPrototypeOf(selector) !== Object.prototype)
	) {
		return false;
	}

	// Also require at least one enumerable property.
	const descriptors = Object.getOwnPropertyDescriptors(selector);
	return Reflect.ownKeys(descriptors).some(key => descriptors[key].enumerable === true);
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
	const enumerableKeys = Reflect.ownKeys(selector).filter(key => Reflect.getOwnPropertyDescriptor(selector, key).enumerable);
	for (const key of enumerableKeys) {
		const subselector = Reflect.get(selector, key);
		comparable[key] = isLikeSelector(subselector)
			? selectComparable(Reflect.get(actual, key), subselector, circular)
			: Reflect.get(actual, key);
	}

	return comparable;
}
