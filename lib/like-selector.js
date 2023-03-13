export function isLikeSelector(selector) {
	const isArrayOrObject = selector !== null && typeof selector === 'object';

	if (!isArrayOrObject) {
		return false;
	}

	const isArray = Array.isArray(selector);
	const minimumKeysRequired = isArray ? 1 : 0;

	return Reflect.ownKeys(selector).length > minimumKeysRequired;
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
		if (isLikeSelector(rhs)) {
			comparable[key] = selectComparable(Reflect.get(lhs, key), rhs, circular);
		} else {
			comparable[key] = Reflect.get(lhs, key);
		}
	}

	return comparable;
}
