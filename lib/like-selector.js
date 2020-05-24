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
// Function selectComparable(lhs, root) {
// 	// Non-objects cannot be compared, so bail out early. Note that this means we
// 	// won't detect circular selectors.
// 	if (lhs === null || typeof lhs !== 'object') {
// 		return {comparable: lhs};
// 	}

// 	const result = {};
// 	const seen = new Set();
// 	const queue = [[lhs, root, result]];
// 	while (queue.length > 0) {
// 		const [current, selector, comparable] = queue.shift();
// 		if (seen.has(selector)) {
// 			return {circular: true};
// 		}

// 		for (const [key, rhs] of Object.values(selector)) {
// 			if (!Reflect.has(current, key)) {
// 				continue;
// 			}

// 			if (isLikeSelector(rhs)) {
// 				const value = Reflect.get(current, key);
// 				if (value === null || typeof value !== 'object') {
// 					comparable[key] = value;
// 				} else {
// 					queue.push([value, rhs, comparable[key] = {}]);
// 				}
// 			} else {
// 				comparable[key] = rhs;
// 			}
// 		}
// 	}

// 	return {comparable: result};
// }

exports.selectComparable = selectComparable;
