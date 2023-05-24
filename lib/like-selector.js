const isObject = selector => Reflect.getPrototypeOf(selector) === Object.prototype;

export function isLikeSelector(selector) {
	if (selector === null || typeof selector !== 'object') {
		return false;
	}

	const keyCount = Reflect.ownKeys(selector).length;
	return (Array.isArray(selector) && keyCount > 1) || (isObject(selector) && keyCount > 0);
}

export const CIRCULAR_SELECTOR = new Error('Encountered a circular selector');

export function selectComparable(lhs, selector, circular = new Set()) {
	if (circular.has(selector)) {
		throw CIRCULAR_SELECTOR;
	}

	circular.add(selector);

	if (lhs === null || typeof lhs !== 'object') {
		return lhs;
	}

	const comparable = Array.isArray(selector) ? [] : {};
	for (const [key, rhs] of Object.entries(selector)) {
		comparable[key] = isLikeSelector(rhs)
			? selectComparable(Reflect.get(lhs, key), rhs, circular)
			: Reflect.get(lhs, key);
	}

	return comparable;
}
