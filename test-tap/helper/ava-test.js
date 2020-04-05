const Test = require('../../lib/test');
const ContextRef = require('../../lib/context-ref');

function withExperiments(experiments = {}) {
	const uniqueTestTitles = new Set();
	const registerUniqueTitle = title => {
		if (uniqueTestTitles.has(title)) {
			return false;
		}

		uniqueTestTitles.add(title);
		return true;
	};

	function ava(fn, contextRef, title = 'test') {
		return new Test({
			annotations: {type: 'test', callback: false},
			contextRef: contextRef || new ContextRef(),
			experiments,
			failWithoutAssertions: true,
			fn,
			registerUniqueTitle,
			title
		});
	}

	ava.failing = (fn, contextRef) => {
		return new Test({
			annotations: {type: 'test', callback: false, failing: true},
			contextRef: contextRef || new ContextRef(),
			experiments,
			failWithoutAssertions: true,
			fn,
			registerUniqueTitle,
			title: 'test.failing'
		});
	};

	ava.cb = (fn, contextRef) => {
		return new Test({
			annotations: {type: 'test', callback: true},
			contextRef: contextRef || new ContextRef(),
			experiments,
			failWithoutAssertions: true,
			fn,
			registerUniqueTitle,
			title: 'test.cb'
		});
	};

	ava.cb.failing = (fn, contextRef) => {
		return new Test({
			annotations: {type: 'test', callback: true, failing: true},
			contextRef: contextRef || new ContextRef(),
			experiments,
			failWithoutAssertions: true,
			fn,
			registerUniqueTitle,
			title: 'test.cb.failing'
		});
	};

	return ava;
}

exports.ava = withExperiments();
exports.withExperiments = withExperiments;
exports.newAva = () => withExperiments();
