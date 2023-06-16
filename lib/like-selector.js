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

export function selectComparable(actual, selector, circular = [selector]) {
	if (isPrimitive(actual)) {
		return actual;
	}

	const comparable = Array.isArray(selector) ? [] : {};
	const enumerableKeys = Reflect.ownKeys(selector).filter(key => Reflect.getOwnPropertyDescriptor(selector, key).enumerable);
	for (const key of enumerableKeys) {
		const subselector = Reflect.get(selector, key);
		if (isLikeSelector(subselector)) {
			if (circular.includes(subselector)) {
				throw CIRCULAR_SELECTOR;
			}

			circular.push(subselector);
			comparable[key] = selectComparable(Reflect.get(actual, key), subselector, circular);
			circular.pop();
		} else {
			comparable[key] = Reflect.get(actual, key);
		}
	}

	return comparable;
}
