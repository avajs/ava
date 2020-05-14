'use strict';
const concordance = require('concordance');
const isPlainObject = require('is-plain-object');

function pickLikePatternPaths(actual, likePattern, visited = new WeakMap()) {
	if (visited.has(likePattern)) {
		return visited.get(likePattern);
	}

	if (isPlainObject(likePattern) && isPlainObject(actual)) {
		const actualPicked = {};

		visited.set(likePattern, actualPicked);

		for (const key of Object.keys(likePattern)) {
			if (key in actual) {
				actualPicked[key] = pickLikePatternPaths(actual[key], likePattern[key], visited);
			}
		}

		return actualPicked;
	}

	return actual;
}

function compare(actual, likePattern, options) {
	const actualPicked = pickLikePatternPaths(actual, likePattern);
	const result = concordance.compare(actualPicked, likePattern, options);
	return {
		actualPicked,
		result
	};
}

exports.compare = compare;
