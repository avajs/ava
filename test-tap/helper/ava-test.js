import ContextRef from '../../lib/context-ref.js';
import Test from '../../lib/test.js';

export function withExperiments(experiments = {}) {
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
			title,
			notifyTimeoutUpdate() {},
		});
	}

	ava.failing = (fn, contextRef) => new Test({
		contextRef: contextRef || new ContextRef(),
		experiments,
		failWithoutAssertions: true,
		fn,
		registerUniqueTitle,
		metadata: {type: 'test', failing: true},
		title: 'test.failing',
		notifyTimeoutUpdate() {},
	});

	return ava;
}

export const ava = withExperiments();
export const newAva = () => withExperiments();
