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
			contextRef: contextRef || new ContextRef(),
			experiments,
			failWithoutAssertions: true,
			fn,
			registerUniqueTitle,
			metadata: {type: 'test'},
			title
		});
	}

	ava.failing = (fn, contextRef) => {
		return new Test({
			contextRef: contextRef || new ContextRef(),
			experiments,
			failWithoutAssertions: true,
			fn,
			registerUniqueTitle,
			metadata: {type: 'test', failing: true},
			title: 'test.failing'
		});
	};

	return ava;
}

exports.ava = withExperiments();
exports.withExperiments = withExperiments;
exports.newAva = () => withExperiments();
