const Test = require('../../lib/test');
const ContextRef = require('../../lib/context-ref');

function withExperiments(experiments = {}) {
	function ava(fn, contextRef) {
		return new Test({
			contextRef: contextRef || new ContextRef(),
			experiments,
			failWithoutAssertions: true,
			fn,
			registerUniqueTitle: () => true,
			metadata: {type: 'test', callback: false},
			title: 'test'
		});
	}

	ava.failing = (fn, contextRef) => {
		return new Test({
			contextRef: contextRef || new ContextRef(),
			experiments,
			failWithoutAssertions: true,
			fn,
			registerUniqueTitle: () => true,
			metadata: {type: 'test', callback: false, failing: true},
			title: 'test.failing'
		});
	};

	ava.cb = (fn, contextRef) => {
		return new Test({
			contextRef: contextRef || new ContextRef(),
			experiments,
			failWithoutAssertions: true,
			fn,
			registerUniqueTitle: () => true,
			metadata: {type: 'test', callback: true},
			title: 'test.cb'
		});
	};

	ava.cb.failing = (fn, contextRef) => {
		return new Test({
			contextRef: contextRef || new ContextRef(),
			experiments,
			failWithoutAssertions: true,
			fn,
			registerUniqueTitle: () => true,
			metadata: {type: 'test', callback: true, failing: true},
			title: 'test.cb.failing'
		});
	};

	return ava;
}

exports.ava = withExperiments();
exports.withExperiments = withExperiments;
