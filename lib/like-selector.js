'use strict';
function isLikeSelector(selector) {
	return selector !== null &&
		typeof selector === 'object' &&
		Reflect.getPrototypeOf(selector) === Object.prototype &&
		Reflect.ownKeys(selector).length > 0;
}

exports.isLikeSelector = isLikeSelector;

const CIRCULAR_SELECTOR = new Error('Encountered a circular selector');
exports.CIRCULAR_SELECTOR = CIRCULAR_SELECTOR;

function selectComparable(lhs, selector, circular = new Set()) {
	if (circular.has(selector)) {
		throw CIRCULAR_SELECTOR;
	}

	circular.add(selector);

	if (lhs === null || typeof lhs !== 'object') {
		return lhs;
	}

	const comparable = {};
	for (const [key, rhs] of Object.entries(selector)) {
		if (isLikeSelector(rhs)) {
			comparable[key] = selectComparable(Reflect.get(lhs, key), rhs, circular);
		} else {
			comparable[key] = Reflect.get(lhs, key);
		}
	}

	return comparable;
}

exports.selectComparable = selectComparable;
